import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { Podium } from '../domain/podium';
import { PodiumPost } from '../domain/podium-post';
import { SportEvent } from '../domain/sport-event';
import { DrizzlePodiumPostRepository } from './drizzle-podium-post.repository';
import { events } from './podiums.schema';

const NOW = new Date('2026-11-07T10:00:00.123Z');
const OFFICIAL = { gold: 214, silver: 108, bronze: 331 };

/** Drizzle enveloppe l'erreur Postgres : on remonte `cause` jusqu'à la contrainte. */
function violatedConstraint(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ('constraint' in current && typeof current.constraint === 'string') {
      return current.constraint;
    }
  }
  return undefined;
}

describe('DrizzlePodiumPostRepository (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let repository: DrizzlePodiumPostRepository;

  /** Une épreuve neuve, au résultat officiel 214, 108, 331, pour isoler chaque test. */
  const newEvent = async (): Promise<SportEvent> => {
    const id = randomUUID();
    await connection.db.insert(events).values({
      id,
      name: '100 m filles',
      officialGoldBib: OFFICIAL.gold,
      officialSilverBib: OFFICIAL.silver,
      officialBronzeBib: OFFICIAL.bronze,
    });
    return SportEvent.restore({
      id,
      name: '100 m filles',
      officialResult: Podium.create(OFFICIAL),
    });
  };

  const publish = (event: SportEvent, journalistName: string) =>
    PodiumPost.publish({
      id: randomUUID(),
      event,
      journalistName,
      podium: Podium.create(OFFICIAL),
      postedAt: NOW,
    });

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    repository = new DrizzlePodiumPostRepository(connection.db);
  });

  afterAll(async () => {
    await connection.close();
  });

  it('002-AS1: reads back the stored post unchanged', async () => {
    const event = await newEvent();
    const post = publish(event, 'Awa');
    await repository.insert(post);

    expect(await repository.listByEvent(event.id)).toEqual([post]);
  });

  it('002-AS6: lists posts in publication order, even within the same millisecond', async () => {
    const event = await newEvent();
    // Des identifiants qui trient à l'envers de l'ordre d'insertion : seul `seq` donne l'ordre.
    const awa = PodiumPost.restore({
      ...snapshot(publish(event, 'Awa')),
      id: 'ffffffff-0000-4000-8000-000000000000',
    });
    const moussa = PodiumPost.restore({
      ...snapshot(publish(event, 'Moussa')),
      id: '00000000-0000-4000-8000-000000000000',
    });
    await repository.insert(awa);
    await repository.insert(moussa);

    const listed = await repository.listByEvent(event.id);
    expect(listed.map((post) => post.journalistName)).toEqual(['Awa', 'Moussa']);
  });

  it('002-AS7: the database refuses a bib at two places', async () => {
    const event = await newEvent();
    const insert = connection.db.execute(sql`
      INSERT INTO podium_posts (id, event_id, journalist_name, gold_bib, silver_bib, bronze_bib, status, posted_at)
      VALUES (${randomUUID()}, ${event.id}, 'Awa', 214, 214, 331, 'VALIDE', now())`);

    await expect(insert).rejects.toSatisfy(
      (error) => violatedConstraint(error) === 'podium_posts_distinct_bibs_check',
    );
  });
});

function snapshot(post: PodiumPost) {
  return {
    id: post.id,
    eventId: post.eventId,
    journalistName: post.journalistName,
    podium: post.podium,
    status: post.status,
    postedAt: post.postedAt,
  };
}
