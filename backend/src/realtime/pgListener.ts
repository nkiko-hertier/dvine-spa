import { Client } from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const CHANNELS = ['booking_updates', 'dashboard_notifications'] as const;
type Channel = (typeof CHANNELS)[number];

export type NotificationHandler = (channel: Channel, payload: unknown) => void;

const RECONNECT_DELAY_MS = 2000;

/**
 * Owns a single dedicated `pg` connection (Prisma's connection pool doesn't
 * expose LISTEN/NOTIFY) subscribed to the channels populated by
 * sql/003_realtime_notifications.sql's triggers. Reconnects automatically
 * on drop — `pg` does not resubscribe LISTEN channels for you after a
 * connection error, so this has to re-issue LISTEN on every reconnect.
 *
 * Safe to run on more than one API instance: `pg_notify` broadcasts to
 * every LISTENing connection, and per API_DOCUMENTATION.md §12.6 the
 * resulting duplicate Socket.IO emits are deduped by the Redis adapter
 * once that's introduced — not needed at the current single-instance scale.
 */
export class PgListener {
  private client: Client | null = null;
  private stopped = false;
  private onNotification: NotificationHandler;

  constructor(onNotification: NotificationHandler) {
    this.onNotification = onNotification;
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.client) {
      await this.client.end().catch(() => undefined);
      this.client = null;
    }
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;

    if (!env.DATABASE_URL) {
      logger.warn('DATABASE_URL not set — realtime Postgres LISTEN bridge will not start.');
      return;
    }

    const client = new Client({ connectionString: env.DATABASE_URL });

    client.on('notification', (msg) => {
      if (!msg.channel || !CHANNELS.includes(msg.channel as Channel)) return;
      try {
        const payload = msg.payload ? JSON.parse(msg.payload) : null;
        this.onNotification(msg.channel as Channel, payload);
      } catch (err) {
        logger.error({ err, channel: msg.channel, raw: msg.payload }, 'Failed to parse pg_notify payload.');
      }
    });

    client.on('error', (err) => {
      logger.error({ err }, 'Postgres LISTEN connection error — reconnecting.');
      this.scheduleReconnect();
    });

    client.on('end', () => {
      if (!this.stopped) {
        logger.warn('Postgres LISTEN connection closed unexpectedly — reconnecting.');
        this.scheduleReconnect();
      }
    });

    try {
      await client.connect();
      for (const channel of CHANNELS) {
        await client.query(`LISTEN ${channel}`);
      }
      this.client = client;
      logger.info({ channels: CHANNELS }, 'Postgres LISTEN bridge connected.');
    } catch (err) {
      logger.error({ err }, 'Failed to establish Postgres LISTEN connection — retrying.');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    this.client = null;
    setTimeout(() => {
      void this.connect();
    }, RECONNECT_DELAY_MS);
  }
}
