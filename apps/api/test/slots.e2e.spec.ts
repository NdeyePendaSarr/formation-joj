import type { INestApplication } from '@nestjs/common';
import { disciplineSchema, registrationSchema, slotSchema, type SlotResponse } from '@joj/shared';
import { count, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../src/core/database/database';
import { DATABASE } from '../src/core/database/database.module';
import { registrations, slots } from '../src/modules/volunteers/infra/volunteers.schema';
import { createTestApp } from './create-test-app';

const UNKNOWN_ID = '0199f5c2-0000-7000-8000-00000000ffff';

describe('/api/creneaux (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let lutteId: string;
  const api = () => request(app.getHttpServer());

  // Pas encore de route de consultation (TR2) : on compte directement en base.
  const slotCount = async () => (await db.select({ n: count() }).from(slots))[0]?.n;
  const registrantCount = async (slotId: string) =>
    (await db.select({ n: count() }).from(registrations).where(eq(registrations.slotId, slotId)))[0]
      ?.n;

  /** Le créneau de Lutte du 2 novembre 2026, de 9 h à 12 h. */
  const lutteMorning = () => ({
    disciplineId: lutteId,
    startsAt: '2026-11-02T09:00:00.000Z',
    endsAt: '2026-11-02T12:00:00.000Z',
    capacity: 2,
  });

  const openLutteSlot = async (): Promise<SlotResponse> =>
    slotSchema.parse((await api().post('/api/creneaux').send(lutteMorning()).expect(201)).body);

  const register = (slotId: string, name: string) =>
    api()
      .post(`/api/creneaux/${slotId}/inscriptions`)
      .send({ name, email: `${name.toLowerCase()}@example.sn` });

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Database>(DATABASE);
  });

  afterAll(() => app?.close());

  beforeEach(async () => {
    const name = `Lutte ${crypto.randomUUID().slice(0, 8)}`;
    const response = await api()
      .post('/api/disciplines')
      .send({ name, category: 'sports-de-combat' })
      .expect(201);
    lutteId = disciplineSchema.parse(response.body).id;
  });

  it('001-AS1: opens a Lutte slot of capacity 2 without registrant (201)', async () => {
    const response = await api().post('/api/creneaux').send(lutteMorning()).expect(201);

    expect(slotSchema.parse(response.body)).toMatchObject({
      disciplineId: lutteId,
      startsAt: '2026-11-02T09:00:00.000Z',
      endsAt: '2026-11-02T12:00:00.000Z',
      capacity: 2,
      registeredCount: 0,
    });
  });

  it.each([
    ['equal to', '2026-11-02T09:00:00.000Z', '2026-11-02T09:00:00.000Z'],
    ['before', '2026-11-02T12:00:00.000Z', '2026-11-02T09:00:00.000Z'],
  ])(
    '001-AS2: rejects an end %s the start (400) and stores nothing',
    async (_l, startsAt, endsAt) => {
      const before = await slotCount();
      const response = await api()
        .post('/api/creneaux')
        .send({ ...lutteMorning(), startsAt, endsAt })
        .expect(400);

      expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
      expect(response.body.errors).toEqual([expect.objectContaining({ path: 'endsAt' })]);
      expect(await slotCount()).toBe(before);
    },
  );

  it('001-AS3: rejects a capacity of 0 (400) and stores nothing', async () => {
    const before = await slotCount();
    const response = await api()
      .post('/api/creneaux')
      .send({ ...lutteMorning(), capacity: 0 })
      .expect(400);

    expect(response.body.errors).toEqual([expect.objectContaining({ path: 'capacity' })]);
    expect(await slotCount()).toBe(before);
  });

  it('001-AS4: rejects an unknown discipline (404) and stores nothing', async () => {
    const before = await slotCount();
    const response = await api()
      .post('/api/creneaux')
      .send({ ...lutteMorning(), disciplineId: UNKNOWN_ID })
      .expect(404);

    expect(response.body).toMatchObject({
      status: 404,
      code: 'SLOT_DISCIPLINE_NOT_FOUND',
      details: { disciplineId: UNKNOWN_ID },
    });
    expect(await slotCount()).toBe(before);
  });

  it('001-AS5: registers Awa and shows 1 remaining place (201)', async () => {
    const slot = await openLutteSlot();
    const response = await register(slot.id, 'Awa').expect(201);

    expect(registrationSchema.parse(response.body)).toMatchObject({
      slotId: slot.id,
      name: 'Awa',
      email: 'awa@example.sn',
      remainingPlaces: 1,
    });
  });

  it('001-AS6: shows 0 remaining places after Moussa (201)', async () => {
    const slot = await openLutteSlot();
    await register(slot.id, 'Awa').expect(201);

    const response = await register(slot.id, 'Moussa').expect(201);

    expect(registrationSchema.parse(response.body)).toMatchObject({
      name: 'Moussa',
      remainingPlaces: 0,
    });
  });

  it('001-AS7: rejects Fatou on a full slot (409 SLOT_FULL)', async () => {
    const slot = await openLutteSlot();
    await register(slot.id, 'Awa').expect(201);
    await register(slot.id, 'Moussa').expect(201);

    const response = await register(slot.id, 'Fatou').expect(409);

    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 409, code: 'SLOT_FULL' });
    expect(await registrantCount(slot.id)).toBe(2);
  });

  it.each([
    ['an empty name', { name: '', email: 'awa@example.sn' }, 'name'],
    ['a malformed email', { name: 'Awa', email: 'awa' }, 'email'],
  ])('001-AS8: rejects %s (400) and registers nobody', async (_l, body, path) => {
    const slot = await openLutteSlot();
    const response = await api()
      .post(`/api/creneaux/${slot.id}/inscriptions`)
      .send(body)
      .expect(400);

    expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(response.body.errors).toEqual([expect.objectContaining({ path })]);
    expect(await registrantCount(slot.id)).toBe(0);
  });

  it('001-AS9: rejects a registration on an unknown slot (404)', async () => {
    const response = await register(UNKNOWN_ID, 'Awa').expect(404);

    expect(response.body).toMatchObject({
      status: 404,
      code: 'SLOT_NOT_FOUND',
      details: { id: UNKNOWN_ID },
    });
  });
});
