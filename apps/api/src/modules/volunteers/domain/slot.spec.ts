import { describe, expect, it } from 'vitest';
import { Slot } from './slot';
import { VolunteerError } from './volunteers.errors';

const SLOT_ID = '0199f5c2-0000-7000-8000-000000000101';
const DISCIPLINE_ID = '0199f5c2-0000-7000-8000-000000000001';
const NINE = new Date('2026-11-02T09:00:00.000Z');
const NOON = new Date('2026-11-02T12:00:00.000Z');

const open = (overrides: Partial<Parameters<typeof Slot.create>[0]> = {}) =>
  Slot.create({
    id: SLOT_ID,
    disciplineId: DISCIPLINE_ID,
    startsAt: NINE,
    endsAt: NOON,
    capacity: 2,
    ...overrides,
  });

describe('Slot', () => {
  it('001-AS1: opens a slot from 9 to 12 on 2 November 2026 with capacity 2 and no registrant', () => {
    expect(open()).toMatchObject({
      id: SLOT_ID,
      disciplineId: DISCIPLINE_ID,
      startsAt: NINE,
      endsAt: NOON,
      capacity: 2,
      registeredCount: 0,
    });
  });

  it('001-AS1: accepts a slot in the past', () => {
    const slot = open({
      startsAt: new Date('2020-01-01T09:00:00.000Z'),
      endsAt: new Date('2020-01-01T12:00:00.000Z'),
    });
    expect(slot.registeredCount).toBe(0);
  });

  it.each([
    ['equal to the start', NINE, NINE],
    ['before the start', NOON, NINE],
  ])('001-AS2: rejects an end %s', (_label, startsAt, endsAt) => {
    expect(() => open({ startsAt, endsAt })).toThrow(VolunteerError);
    expect(() => open({ startsAt, endsAt })).toThrow(
      expect.objectContaining({ code: 'SLOT_END_NOT_AFTER_START', kind: 'VALIDATION' }),
    );
  });

  it.each([0, -1, 1.5])('001-AS3: rejects a capacity of %d', (capacity) => {
    expect(() => open({ capacity })).toThrow(
      expect.objectContaining({ code: 'SLOT_CAPACITY_INVALID', kind: 'VALIDATION' }),
    );
  });

  const NOW = new Date('2026-11-01T08:00:00.000Z');
  const volunteer = (n: number, name: string) => ({
    id: `0199f5c2-0000-7000-8000-00000000020${n}`,
    name,
    email: `${name.toLowerCase()}@example.sn`,
    now: NOW,
  });

  it('001-AS5: registers Awa on an empty slot of capacity 2 and leaves 1 place', () => {
    const slot = open();
    const registration = slot.register(volunteer(1, 'Awa'));

    expect(registration).toMatchObject({ slotId: SLOT_ID, name: 'Awa', email: 'awa@example.sn' });
    expect(slot.registeredCount).toBe(1);
    expect(slot.remainingPlaces).toBe(1);
  });

  it('001-AS6: accepts Moussa on the last place and leaves 0', () => {
    const slot = open();
    slot.register(volunteer(1, 'Awa'));

    expect(() => slot.register(volunteer(2, 'Moussa'))).not.toThrow();
    expect(slot.registeredCount).toBe(2);
    expect(slot.remainingPlaces).toBe(0);
  });

  it('001-AS7: refuses to register on a full slot', () => {
    const slot = open();
    slot.register(volunteer(1, 'Awa'));
    slot.register(volunteer(2, 'Moussa'));

    expect(() => slot.register(volunteer(3, 'Fatou'))).toThrow(
      expect.objectContaining({ code: 'SLOT_FULL', kind: 'CONFLICT' }),
    );
    expect(slot.registeredCount).toBe(2);
  });

  it('001-AS8: does not count a refused registration', () => {
    const slot = open();
    expect(() => slot.register({ ...volunteer(1, 'Awa'), email: 'awa' })).toThrow(
      expect.objectContaining({ code: 'VOLUNTEER_EMAIL_INVALID' }),
    );
    expect(slot.registeredCount).toBe(0);
  });

  it('001-AS1: restores a slot from storage with its registered count', () => {
    const slot = Slot.restore({
      id: SLOT_ID,
      disciplineId: DISCIPLINE_ID,
      startsAt: NINE,
      endsAt: NOON,
      capacity: 2,
      registeredCount: 1,
    });
    expect(slot.registeredCount).toBe(1);
  });
});
