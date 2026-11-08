import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { DrizzleSportEventRepository } from './drizzle-sport-event.repository';
import { events } from './podiums.schema';

/** Drizzle enveloppe l'erreur Postgres : on remonte `cause` jusqu'à la contrainte. */
function violatedConstraint(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ('constraint' in current && typeof current.constraint === 'string') {
      return current.constraint;
    }
  }
  return undefined;
}

describe('DrizzleSportEventRepository (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let repository: DrizzleSportEventRepository;

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    repository = new DrizzleSportEventRepository(connection.db);
  });

  afterAll(async () => {
    await connection.close();
  });

  it('002-AS1: reads an event with its official result in the order gold, silver, bronze', async () => {
    const id = randomUUID();
    await connection.db.insert(events).values({
      id,
      name: '100 m filles',
      officialGoldBib: 214,
      officialSilverBib: 108,
      officialBronzeBib: 331,
    });

    const event = await repository.findById(id);
    expect(event).toMatchObject({ id, name: '100 m filles' });
    expect(event?.officialResult).toMatchObject({ gold: 214, silver: 108, bronze: 331 });
  });

  it('002-AS4: reads an event without official result as null', async () => {
    const id = randomUUID();
    await connection.db.insert(events).values({ id, name: '200 m garçons' });

    expect(await repository.findById(id)).toMatchObject({ id, officialResult: null });
  });

  it('002-AS5: returns null for an unknown event', async () => {
    expect(await repository.findById(randomUUID())).toBeNull();
  });

  it('002-AS4: refuses an official result with only some of its three places', async () => {
    const insert = connection.db
      .insert(events)
      .values({ id: randomUUID(), name: 'Incomplet', officialGoldBib: 214 });

    await expect(insert).rejects.toSatisfy(
      (error) => violatedConstraint(error) === 'events_official_result_check',
    );
  });
});
