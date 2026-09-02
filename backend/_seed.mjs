/**
 * One-off: load backend/backup.sql (a pg_dump: schema + data) into the target DB.
 * - strips psql meta-commands (\restrict/\unrestrict) and `... OWNER TO dvine;`
 *   / `COMMENT ON EXTENSION ...;` that need a role/superuser we don't have
 * - runs DDL statement-by-statement (dollar-quote aware splitter)
 * - replays `COPY ... FROM stdin` blocks via the real COPY protocol
 * - everything inside one transaction; any error => full rollback
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const URL = process.env.SEED_DB_URL;
const SQL_PATH = process.env.SEED_SQL || path.resolve('backup.sql');
if (!URL) throw new Error('SEED_DB_URL not set');

const raw = fs.readFileSync(SQL_PATH, 'utf8');

// ---- 1. carve the file into ordered segments: sql text | copy block ----------
const lines = raw.split('\n');
const segments = [];
let buf = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = /^COPY\s+.+\sFROM\sstdin;/.test(line);
  if (!m) { buf.push(line); continue; }
  segments.push({ type: 'sql', text: buf.join('\n') });
  buf = [];
  const header = line;
  const data = [];
  i++;
  while (i < lines.length && lines[i] !== '\\.') { data.push(lines[i]); i++; }
  segments.push({ type: 'copy', header, data: data.join('\n') });
}
segments.push({ type: 'sql', text: buf.join('\n') });

// ---- 2. clean the sql text --------------------------------------------------
function cleanSql(text) {
  return text
    .split('\n')
    .filter((l) => !/^\\(restrict|unrestrict)\b/.test(l))
    .join('\n')
    .replace(/^ALTER\s+\w[\w\s]*?\s+OWNER\s+TO\s+\w+;\s*$/gim, '')
    .replace(/^COMMENT\s+ON\s+EXTENSION\s+.*?;\s*$/gim, '');
}

// ---- 3. dollar-quote aware statement splitter ------------------------------
function splitStatements(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  let inSingle = false;
  let dollarTag = null;
  while (i < sql.length) {
    const ch = sql[i];
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) { cur += dollarTag; i += dollarTag.length; dollarTag = null; continue; }
      cur += ch; i++; continue;
    }
    if (inSingle) {
      cur += ch;
      if (ch === "'") { if (sql[i + 1] === "'") { cur += "'"; i += 2; continue; } inSingle = false; }
      i++; continue;
    }
    if (ch === "'") { inSingle = true; cur += ch; i++; continue; }
    if (ch === '$') {
      const mt = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (mt) { dollarTag = mt[0]; cur += dollarTag; i += dollarTag.length; continue; }
    }
    if (ch === '-' && sql[i + 1] === '-') { // line comment
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl;
      cur += sql.slice(i, end); i = end; continue;
    }
    if (ch === ';') { out.push(cur.trim()); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => s && !/^(--|\s*$)/.test(s));
}

const IGNORABLE = /^(CREATE\s+EXTENSION|COMMENT\s+ON\s+EXTENSION)/i;
const isUpstream = (e) => /Failed to connect to upstream|Connection terminated|ECONNRESET|server closed the connection/i.test(e?.message || '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runOnce() {
  const client = new pg.Client({ connectionString: URL, ssl: { rejectUnauthorized: false }, statement_timeout: 120000, query_timeout: 120000 });
  client.on('error', (e) => console.warn('  (client error event)', e.message));
  let ddlRun = 0, ddlSkipped = 0, copyRows = 0;
  await client.connect();
  try {
    const guard = await client.query("select to_regclass('public.treatments') as t");
    if (guard.rows[0].t && process.env.FORCE !== '1') {
      throw Object.assign(new Error('public.treatments already exists — refusing to seed. Set FORCE=1 to proceed anyway.'), { fatal: true });
    }
    await client.query('BEGIN');
    for (const seg of segments) {
      if (seg.type === 'sql') {
        for (const stmt of splitStatements(cleanSql(seg.text))) {
          try {
            await client.query(stmt);
            ddlRun++;
          } catch (e) {
            if (IGNORABLE.test(stmt)) { ddlSkipped++; console.warn('  ~ skipped:', stmt.slice(0, 70).replace(/\s+/g, ' '), '=>', e.message); continue; }
            console.error('\n!! failed statement:\n', stmt.slice(0, 400));
            throw e;
          }
        }
      } else {
        const table = /^COPY\s+(\S+)/.exec(seg.header)[1];
        const rows = seg.data.trim() ? seg.data.trim().split('\n').length : 0;
        if (rows === 0) { console.log(`  COPY ${table}: 0 rows (skip)`); continue; }
        const ingest = client.query(copyFrom(seg.header));
        await pipeline(Readable.from([seg.data.endsWith('\n') ? seg.data : seg.data + '\n']), ingest);
        copyRows += rows;
        console.log(`  COPY ${table}: ${rows} rows`);
      }
    }
    await client.query('COMMIT');
    console.log(`\nOK — committed. DDL run: ${ddlRun}, DDL skipped: ${ddlSkipped}, data rows: ${copyRows}`);
  } finally {
    try { await client.end(); } catch {}
  }
}

const MAX = 6;
for (let attempt = 1; attempt <= MAX; attempt++) {
  try {
    if (attempt > 1) console.log(`\n--- attempt ${attempt}/${MAX} ---`);
    await runOnce();
    process.exitCode = 0;
    break;
  } catch (e) {
    if (e.fatal) { console.error('\n' + e.message); process.exitCode = 1; break; }
    console.error(`attempt ${attempt} failed: ${e.message}`);
    if (attempt === MAX) { console.error('\nGiving up.'); process.exitCode = 1; break; }
    if (isUpstream(e)) { await sleep(6000); continue; }
    // non-transient (real SQL error) — no point retrying
    process.exitCode = 1; break;
  }
}
