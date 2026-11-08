import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { podiumPostListSchema, podiumPostSchema } from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../src/core/database/database';
import { DATABASE } from '../src/core/database/database.module';
import { events } from '../src/modules/podiums/infra/podiums.schema';
import { createTestApp } from './create-test-app';

const UNKNOWN_ID = '0199f5c3-0000-7000-8000-00000000ffff';
const AWA_PODIUM = { journalistName: 'Awa', gold: 214, silver: 108, bronze: 331 };

describe('/api/epreuves/:id/podiums (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let girls100mId: string;
  let boys200mId: string;
  const api = () => request(app.getHttpServer());

  const post = (eventId: string, body: object) =>
    api().post(`/api/epreuves/${eventId}/podiums`).send(body);

  const listPosts = async (eventId: string) =>
    podiumPostListSchema.parse(
      (await api().get(`/api/epreuves/${eventId}/podiums`).expect(200)).body,
    );

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Database>(DATABASE);
  });

  afterAll(() => app?.close());

  // Pas de route pour créer une épreuve (hors périmètre) : chaque test insère les siennes en base,
  // sans dépendre des données de départ.
  beforeEach(async () => {
    girls100mId = randomUUID();
    boys200mId = randomUUID();
    await db.insert(events).values([
      {
        id: girls100mId,
        name: '100 m filles',
        officialGoldBib: 214,
        officialSilverBib: 108,
        officialBronzeBib: 331,
      },
      { id: boys200mId, name: '200 m garçons' },
    ]);
  });

  it('002-AS1: publishes a matching podium as VALIDE (201)', async () => {
    const response = await post(girls100mId, AWA_PODIUM).expect(201);

    expect(podiumPostSchema.parse(response.body)).toMatchObject({
      eventId: girls100mId,
      journalistName: 'Awa',
      gold: 214,
      silver: 108,
      bronze: 331,
      status: 'VALIDE',
    });
  });

  it('002-AS2: lists the posts of an event (200), and an empty list for an event without post', async () => {
    const published = podiumPostSchema.parse(
      (await post(girls100mId, AWA_PODIUM).expect(201)).body,
    );

    expect(await listPosts(girls100mId)).toEqual([published]);
    expect(await listPosts(boys200mId)).toEqual([]);
  });

  it.each([
    ['swapped places', { gold: 108, silver: 214, bronze: 331 }],
    ['an athlete off the official podium', { gold: 214, silver: 108, bronze: 999 }],
  ])(
    '002-AS3: rejects a contradicting podium with %s (409 PODIUM_CONTRADICTS_OFFICIAL)',
    async (_label, bibs) => {
      const response = await post(girls100mId, { journalistName: 'Awa', ...bibs }).expect(409);

      expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(response.body).toMatchObject({ status: 409, code: 'PODIUM_CONTRADICTS_OFFICIAL' });
      expect(await listPosts(girls100mId)).toEqual([]);
    },
  );

  it('002-AS4: rejects a podium for an event without official result (409 OFFICIAL_RESULT_UNKNOWN)', async () => {
    const response = await post(boys200mId, AWA_PODIUM).expect(409);

    expect(response.body).toMatchObject({ status: 409, code: 'OFFICIAL_RESULT_UNKNOWN' });
    expect(await listPosts(boys200mId)).toEqual([]);
  });

  it('002-AS5: rejects an unknown event, to post as well as to list (404 EVENT_NOT_FOUND)', async () => {
    const posted = await post(UNKNOWN_ID, AWA_PODIUM).expect(404);
    const listed = await api().get(`/api/epreuves/${UNKNOWN_ID}/podiums`).expect(404);

    expect(posted.body).toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' });
    expect(listed.body).toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' });
  });

  it('002-AS6: keeps the first post and adds a new one, in publication order', async () => {
    const awa = podiumPostSchema.parse((await post(girls100mId, AWA_PODIUM).expect(201)).body);
    const moussa = podiumPostSchema.parse(
      (await post(girls100mId, { ...AWA_PODIUM, journalistName: 'Moussa' }).expect(201)).body,
    );

    expect(await listPosts(girls100mId)).toEqual([awa, moussa]);
    expect(moussa.id).not.toBe(awa.id);
    expect(moussa.status).toBe('VALIDE');
  });

  it.each([
    ['an empty name', { ...AWA_PODIUM, journalistName: '' }, 'journalistName'],
    ['a name of spaces', { ...AWA_PODIUM, journalistName: '   ' }, 'journalistName'],
    [
      'a name of 101 characters',
      { ...AWA_PODIUM, journalistName: 'x'.repeat(101) },
      'journalistName',
    ],
    ['a missing bib', { journalistName: 'Awa', gold: 214, silver: 108 }, 'bronze'],
    ['a bib of 0', { ...AWA_PODIUM, bronze: 0 }, 'bronze'],
    ['a bib above the storable limit', { ...AWA_PODIUM, bronze: 2_147_483_648 }, 'bronze'],
    ['a bib that is not an integer', { ...AWA_PODIUM, bronze: 3.5 }, 'bronze'],
    ['a bib at two places', { ...AWA_PODIUM, bronze: 214 }, 'bronze'],
  ])(
    '002-AS7: rejects %s (400 VALIDATION_FAILED), says which field is at fault and publishes nothing',
    async (_label, body, field) => {
      const response = await post(girls100mId, body).expect(400);

      expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
      // « La réponse dit pourquoi » : une seule erreur, sur le champ en faute, avec un message.
      expect(response.body.errors).toEqual([
        expect.objectContaining({ path: field, message: expect.any(String) }),
      ]);
      expect(await listPosts(girls100mId)).toEqual([]);
    },
  );

  it('002-AS7: rejects a malformed event id (400 VALIDATION_FAILED)', async () => {
    const response = await post('not-a-uuid', AWA_PODIUM).expect(400);

    expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
  });
});
