import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { Discipline } from '../../disciplines/domain/discipline';
import { DrizzleDisciplineRepository } from '../../disciplines/infra/drizzle-discipline.repository';
import { DrizzleDisciplineLookup } from './drizzle-discipline-lookup';

describe('DrizzleDisciplineLookup (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let lookup: DrizzleDisciplineLookup;

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    lookup = new DrizzleDisciplineLookup(connection.db);
  });

  afterAll(() => connection?.close());

  it('001-AS4: knows a stored discipline and not an unknown id', async () => {
    const lutte = Discipline.create({
      id: randomUUID(),
      name: 'Lutte',
      category: 'sports-de-combat',
      now: new Date(),
    });
    await new DrizzleDisciplineRepository(connection.db).insert(lutte);

    expect(await lookup.exists(lutte.id)).toBe(true);
    expect(await lookup.exists(randomUUID())).toBe(false);
  });
});
