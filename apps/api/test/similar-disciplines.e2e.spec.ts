import type { INestApplication } from '@nestjs/common';
import { type CreateDisciplineInput, disciplineSchema, type DisciplineResponse } from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

const UNKNOWN_ID = '0199f5c2-0000-7000-8000-00000000ffff';

describe('/api/disciplines/:id/similaires (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  const add = async (input: CreateDisciplineInput): Promise<DisciplineResponse> => {
    const response = await api().post('/api/disciplines').send(input).expect(201);
    return disciplineSchema.parse(response.body);
  };

  beforeAll(async () => {
    // Base neuve propre à ce fichier : les catégories ne contiennent que ce qui est créé ici.
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  it('000-AS12: lists the other disciplines of the same category, sorted by name (200)', async () => {
    const lutte = await add({ name: 'Lutte', category: 'sports-de-combat' });
    const taekwondo = await add({ name: 'Taekwondo', category: 'sports-de-combat' });
    const judo = await add({ name: 'Judo', category: 'sports-de-combat' });
    const natation = await add({ name: 'Natation', category: 'sports-nautiques' });

    const similar = await api().get(`/api/disciplines/${lutte.id}/similaires`).expect(200);
    expect(similar.body).toEqual([judo, taekwondo]);

    const alone = await api().get(`/api/disciplines/${natation.id}/similaires`).expect(200);
    expect(alone.body).toEqual([]);
  });

  it('000-AS12: answers 404 for the similar disciplines of an unknown discipline', async () => {
    const response = await api().get(`/api/disciplines/${UNKNOWN_ID}/similaires`).expect(404);
    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 404, code: 'DISCIPLINE_NOT_FOUND' });
  });

  it('000-AS12: rejects an id that is not a UUID (400)', async () => {
    const response = await api().get('/api/disciplines/pas-un-uuid/similaires').expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
