import type { INestApplication } from '@nestjs/common';
import { disciplineCountsByCategorySchema } from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

describe('/api/disciplines/par-categorie (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    // Base neuve propre à ce fichier : les nombres ne comptent que ce qui est créé ici.
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  it('000-AS5: answers 0 for each of the five categories when there is no discipline (200)', async () => {
    const response = await api().get('/api/disciplines/par-categorie').expect(200);
    expect(response.body).toEqual([
      { category: 'athletisme', count: 0 },
      { category: 'sports-collectifs', count: 0 },
      { category: 'sports-de-combat', count: 0 },
      { category: 'sports-nautiques', count: 0 },
      { category: 'sports-de-precision', count: 0 },
    ]);
  });

  it('000-AS5: counts the disciplines of each category, 0 included (200)', async () => {
    for (const [name, category] of [
      ['Lutte', 'sports-de-combat'],
      ['Judo', 'sports-de-combat'],
      ['Natation', 'sports-nautiques'],
    ]) {
      await api().post('/api/disciplines').send({ name, category }).expect(201);
    }

    const response = await api().get('/api/disciplines/par-categorie').expect(200);
    expect(disciplineCountsByCategorySchema.parse(response.body)).toEqual([
      { category: 'athletisme', count: 0 },
      { category: 'sports-collectifs', count: 0 },
      { category: 'sports-de-combat', count: 2 },
      { category: 'sports-nautiques', count: 1 },
      { category: 'sports-de-precision', count: 0 },
    ]);
  });
});
