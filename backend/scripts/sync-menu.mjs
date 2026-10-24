#!/usr/bin/env node
/**
 * Syncs the live catalog (categories + treatments) to data/menu-2026-09.json
 * through the admin API, so the booking page and the website show the
 * owner's updated menu.
 *
 * What it does, per category and treatment in the JSON:
 *   - matches an existing row by the new name, or by any name listed in
 *     `replaces` (case-insensitive), and PATCHes it in place: new name,
 *     price, duration, description, category, display order, active. Ids
 *     are kept, so booking history and links stay intact.
 *   - creates the row when nothing matches.
 *   - deactivates (never deletes) every treatment that is not on the new
 *     menu, and any extra rows matched by `replaces` beyond the first.
 *   - categories not on the new menu are left alone but end up empty.
 *
 * It is a DRY RUN unless you pass --apply. Read the plan first.
 *
 * Usage:
 *   SPA_ADMIN_TOKEN=<clerk session jwt of an admin> node scripts/sync-menu.mjs
 *   SPA_ADMIN_TOKEN=... node scripts/sync-menu.mjs --apply
 *
 * Getting a token: sign in to the staff dashboard, open the browser console
 * and run  await window.Clerk.session.getToken() , it is valid for about
 * a minute, so run the script right away (it refreshes nothing).
 *
 * Env:
 *   API_URL   API origin (default https://cms-api.pixelspringmarketing.com)
 *   MENU      path to the menu JSON (default data/menu-2026-09.json)
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = (process.env.API_URL || 'https://cms-api.pixelspringmarketing.com').replace(/\/+$/, '');
const TOKEN = process.env.SPA_ADMIN_TOKEN;
const MENU_PATH = resolve(ROOT, process.env.MENU || 'data/menu-2026-09.json');
const APPLY = process.argv.includes('--apply');

if (!TOKEN) {
  console.error('SPA_ADMIN_TOKEN is required (a Clerk session token of an admin user).');
  process.exit(1);
}

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const msg = json?.error?.message || `${res.status} ${res.statusText}`;
    const details = json?.error?.details ? ` ${JSON.stringify(json.error.details)}` : '';
    throw new Error(`${method} ${path} -> ${msg}${details}`);
  }
  return json;
}

async function listAll(path) {
  const rows = [];
  for (let page = 1; page < 50; page++) {
    const { data, meta } = await api('GET', `${path}?limit=100&page=${page}`);
    rows.push(...data);
    if (!meta || page >= meta.total_pages) break;
  }
  return rows;
}

/** Find a row whose name equals the new name or any of the replaced names. */
function matchAll(rows, item) {
  const wanted = new Set([norm(item.name), ...(item.replaces ?? []).map(norm)]);
  return rows.filter((r) => wanted.has(norm(r.name)));
}

const plan = []; // { op, kind, name, detail, run }
const log = (op, kind, name, detail = '') => plan.push({ op, kind, name, detail });

async function main() {
  const menu = JSON.parse(await readFile(MENU_PATH, 'utf8'));

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} against ${API}\n`);
  const [categories, treatments] = await Promise.all([
    listAll('/admin/categories'),
    listAll('/admin/treatments'),
  ]);
  console.log(`Live: ${categories.length} categories, ${treatments.length} treatments\n`);

  const claimedCategories = new Set();
  const claimedTreatments = new Set();
  const actions = [];

  menu.categories.forEach((cat, ci) => {
    const displayOrder = ci + 1;
    const matches = matchAll(categories, cat).filter((c) => !claimedCategories.has(c.id));
    const body = { name: cat.name, description: cat.description ?? '', display_order: displayOrder, is_active: true };
    if (matches.length) {
      const c = matches[0];
      claimedCategories.add(c.id);
      const rename = norm(c.name) !== norm(cat.name) ? ` (was "${c.name}")` : '';
      log('update', 'category', cat.name, rename);
      actions.push(async () => {
        await api('PATCH', `/admin/categories/${c.id}`, body);
        return c.id;
      });
    } else {
      log('create', 'category', cat.name);
      const { is_active: _ignored, ...createBody } = body;
      actions.push(async () => (await api('POST', '/admin/categories', createBody)).data.id);
    }
    const categoryIndex = actions.length - 1;

    cat.treatments.forEach((t, ti) => {
      const tMatches = matchAll(treatments, t).filter((r) => !claimedTreatments.has(r.id));
      const payload = {
        name: t.name,
        description: t.description ?? '',
        duration_minutes: t.duration_minutes,
        price: t.price,
        benefits: t.benefits ?? [],
        recommended_for: t.recommended_for ?? [],
        display_order: ti + 1,
      };
      if (tMatches.length) {
        // Prefer an exact-name match, else the first replaced name.
        const exact = tMatches.find((r) => norm(r.name) === norm(t.name));
        const keep = exact ?? tMatches[0];
        claimedTreatments.add(keep.id);
        const changes = [];
        if (norm(keep.name) !== norm(t.name)) changes.push(`rename from "${keep.name}"`);
        if (Number(keep.price) !== t.price) changes.push(`price ${Number(keep.price)} -> ${t.price}`);
        if (keep.duration_minutes !== t.duration_minutes) changes.push(`duration ${keep.duration_minutes} -> ${t.duration_minutes}`);
        if (!keep.is_active) changes.push('re-activate');
        if (keep.category?.name !== cat.name) changes.push(`move to ${cat.name}`);
        log('update', 'treatment', t.name, changes.join(', ') || 'description/order only');
        actions.push(async (ctx) => {
          await api('PATCH', `/admin/treatments/${keep.id}`, {
            ...payload,
            category_id: ctx.categoryIds[categoryIndex],
            is_active: true,
          });
        });
        for (const extra of tMatches.filter((r) => r.id !== keep.id)) {
          claimedTreatments.add(extra.id);
          log('deactivate', 'treatment', extra.name, `merged into "${t.name}"`);
          actions.push(async () => {
            await api('PATCH', `/admin/treatments/${extra.id}`, { is_active: false });
          });
        }
      } else {
        log('create', 'treatment', t.name, `${cat.name}, ${t.price} RWF, ${t.duration_minutes} min`);
        actions.push(async (ctx) => {
          await api('POST', '/admin/treatments', { ...payload, category_id: ctx.categoryIds[categoryIndex] });
        });
      }
    });
  });

  // Everything else on the live catalog is no longer on the menu.
  for (const r of treatments) {
    if (claimedTreatments.has(r.id)) continue;
    if (!r.is_active) continue; // already off
    log('deactivate', 'treatment', r.name, 'not on the new menu');
    actions.push(async () => {
      await api('PATCH', `/admin/treatments/${r.id}`, { is_active: false });
    });
  }

  // ---- print the plan ----
  const counts = {};
  for (const p of plan) {
    counts[`${p.op} ${p.kind}`] = (counts[`${p.op} ${p.kind}`] || 0) + 1;
    console.log(`${p.op.padEnd(10)} ${p.kind.padEnd(9)} ${p.name}${p.detail ? ` , ${p.detail}` : ''}`);
  }
  console.log('\nSummary:', counts);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
    return;
  }

  // ---- apply, in order (category ids are needed by their treatments) ----
  const ctx = { categoryIds: {} };
  let done = 0;
  for (let i = 0; i < actions.length; i++) {
    const p = plan[i];
    try {
      const result = await actions[i](ctx);
      if (p.kind === 'category') ctx.categoryIds[i] = result;
      done++;
    } catch (err) {
      console.error(`\nFAILED at step ${i + 1}/${actions.length} (${p.op} ${p.kind} "${p.name}"): ${err.message}`);
      console.error('Fix the cause and re-run: the script is idempotent, finished steps are simply matched again.');
      process.exit(1);
    }
  }
  console.log(`\nDone: ${done} changes applied. Purge the CDN cache or wait up to 2 minutes for the booking page to refresh.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
