import { describe, expect, it } from 'vitest';
import { InMemoryDisciplineLookup } from './testing/in-memory-discipline-lookup';
import { InMemorySlotRepository } from './testing/in-memory-slot.repository';
import { OpenSlot } from './use-cases/open-slot';

const LUTTE = '0199f5c2-0000-7000-8000-000000000001';
const UNKNOWN = '0199f5c2-0000-7000-8000-0000000000ff';

function setup() {
  const slots = new InMemorySlotRepository();
  const disciplines = new InMemoryDisciplineLookup([LUTTE]);
  return { slots, openSlot: new OpenSlot(slots, disciplines) };
}

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
});
