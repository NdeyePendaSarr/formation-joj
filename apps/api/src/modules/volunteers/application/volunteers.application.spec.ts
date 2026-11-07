import { describe, expect, it } from 'vitest';
import { InMemoryDisciplineLookup } from './testing/in-memory-discipline-lookup';
import { InMemorySlotRepository } from './testing/in-memory-slot.repository';
import { OpenSlot } from './use-cases/open-slot';
import { RegisterVolunteer } from './use-cases/register-volunteer';

const LUTTE = '0199f5c2-0000-7000-8000-000000000001';
const UNKNOWN = '0199f5c2-0000-7000-8000-0000000000ff';

function setup() {
  const slots = new InMemorySlotRepository();
  const disciplines = new InMemoryDisciplineLookup([LUTTE]);
  return {
    slots,
    openSlot: new OpenSlot(slots, disciplines),
    registerVolunteer: new RegisterVolunteer(slots),
  };
}

const awa = { name: 'Awa', email: 'awa@example.sn' };
const moussa = { name: 'Moussa', email: 'moussa@example.sn' };
const fatou = { name: 'Fatou', email: 'fatou@example.sn' };

const lutteMorning = {
  disciplineId: LUTTE,
  startsAt: '2026-11-02T09:00:00.000Z',
  endsAt: '2026-11-02T12:00:00.000Z',
  capacity: 2,
};

describe('volunteers (application layer)', () => {
  it('001-AS1: opens a slot for Lutte and stores it without registrant', async () => {
    const { slots, openSlot } = setup();
    const slot = await openSlot.execute(lutteMorning);

    expect(slot.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await slots.findById(slot.id)).toEqual(slot);
    expect(slot).toMatchObject({
      disciplineId: LUTTE,
      startsAt: new Date('2026-11-02T09:00:00.000Z'),
      endsAt: new Date('2026-11-02T12:00:00.000Z'),
      capacity: 2,
      registeredCount: 0,
    });
  });

  it('001-AS1: accepts two overlapping slots for the same discipline', async () => {
    const { slots, openSlot } = setup();
    await openSlot.execute(lutteMorning);
    await openSlot.execute({ ...lutteMorning, startsAt: '2026-11-02T10:00:00.000Z' });

    expect(slots.all()).toHaveLength(2);
  });

  it('001-AS4: rejects an unknown discipline and stores nothing', async () => {
    const { slots, openSlot } = setup();

    await expect(
      openSlot.execute({ ...lutteMorning, disciplineId: UNKNOWN }),
    ).rejects.toMatchObject({
      code: 'SLOT_DISCIPLINE_NOT_FOUND',
      kind: 'NOT_FOUND',
      details: { disciplineId: UNKNOWN },
    });
    expect(slots.all()).toEqual([]);
  });

  it('001-AS5: registers Awa on the Lutte slot of capacity 2 and leaves 1 place', async () => {
    const { slots, openSlot, registerVolunteer } = setup();
    const slot = await openSlot.execute(lutteMorning);

    const result = await registerVolunteer.execute(slot.id, awa);

    expect(result.registration).toMatchObject({ slotId: slot.id, ...awa });
    expect(result.slot.remainingPlaces).toBe(1);
    expect(slots.registrationsOf(slot.id)).toEqual([result.registration]);
    expect((await slots.findById(slot.id))?.registeredCount).toBe(1);
  });

  it('001-AS6: accepts Moussa on the last place and leaves 0', async () => {
    const { openSlot, registerVolunteer } = setup();
    const slot = await openSlot.execute(lutteMorning);
    await registerVolunteer.execute(slot.id, awa);

    const result = await registerVolunteer.execute(slot.id, moussa);

    expect(result.registration).toMatchObject(moussa);
    expect(result.slot.remainingPlaces).toBe(0);
  });

  it('001-AS7: refuses Fatou on the full slot and keeps 2 registrants', async () => {
    const { slots, openSlot, registerVolunteer } = setup();
    const slot = await openSlot.execute(lutteMorning);
    await registerVolunteer.execute(slot.id, awa);
    await registerVolunteer.execute(slot.id, moussa);

    await expect(registerVolunteer.execute(slot.id, fatou)).rejects.toMatchObject({
      code: 'SLOT_FULL',
      kind: 'CONFLICT',
    });
    expect(slots.registrationsOf(slot.id).map((r) => r.name)).toEqual(['Awa', 'Moussa']);
    expect((await slots.findById(slot.id))?.registeredCount).toBe(2);
  });

  it('001-AS9: rejects a registration on an unknown slot', async () => {
    const { registerVolunteer } = setup();

    await expect(registerVolunteer.execute(UNKNOWN, awa)).rejects.toMatchObject({
      code: 'SLOT_NOT_FOUND',
      kind: 'NOT_FOUND',
      details: { id: UNKNOWN },
    });
  });
});
