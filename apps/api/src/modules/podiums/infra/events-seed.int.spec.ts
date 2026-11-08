import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedStatements } from '../../../../scripts/db-core.mts';
import { MIGRATIONS_DIR } from '../../../core/database/database';
import { DrizzleSportEventRepository } from './drizzle-sport-event.repository';
import { events } from './podiums.schema';

const EVENTS_FILE = join(__dirname, '..', '..', '..', '..', 'data', 'events.json');

/** Seul test qui lit les données de départ : les autres créent leurs propres épreuves. */
describe('data/events.json (seeded like pnpm db:seed)', () => {
  const client = new PGlite('memory://');
  const db = drizzle({ client });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    // Le même chemin que `pnpm db:seed` : les mêmes requêtes, envoyées au client Postgres.
    for (const statement of seedStatements(
      'events',
      JSON.parse(readFileSync(EVENTS_FILE, 'utf8')),
    )) {
      await client.query(statement.sql, statement.params);
    }
  });

  afterAll(async () => {
    await client.close();
  });

  it('002-AS4: seeds at least one event without an official result', async () => {
    const repository = new DrizzleSportEventRepository(db);
    const seeded = await Promise.all(
      (await db.select({ id: events.id }).from(events)).map(({ id }) => repository.findById(id)),
    );

    expect(seeded.some((event) => event !== null && event.officialResult === null)).toBe(true);
  });
});
