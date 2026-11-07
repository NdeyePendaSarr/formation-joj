import { describe, expect, it } from 'vitest';
import { Registration } from './registration';
import { VolunteerError } from './volunteers.errors';

const ID = '0199f5c2-0000-7000-8000-000000000201';
const SLOT_ID = '0199f5c2-0000-7000-8000-000000000101';
const NOW = new Date('2026-11-01T08:00:00.000Z');

const register = (name: string, email: string) =>
  Registration.create({ id: ID, slotId: SLOT_ID, name, email, now: NOW });

describe('Registration', () => {
  it('001-AS5: keeps the trimmed name and the email of the volunteer', () => {
    expect(register('  Awa  ', 'awa@example.sn')).toMatchObject({
      id: ID,
      slotId: SLOT_ID,
      name: 'Awa',
      email: 'awa@example.sn',
      registeredAt: NOW,
    });
  });

  it.each(['', '   '])('001-AS8: rejects a volunteer without a name (%j)', (name) => {
    expect(() => register(name, 'awa@example.sn')).toThrow(VolunteerError);
    expect(() => register(name, 'awa@example.sn')).toThrow(
      expect.objectContaining({ code: 'VOLUNTEER_NAME_REQUIRED', kind: 'VALIDATION' }),
    );
  });

  it('001-AS8: rejects a name of 101 characters and accepts 100', () => {
    expect(() => register('x'.repeat(101), 'awa@example.sn')).toThrow(
      expect.objectContaining({ code: 'VOLUNTEER_NAME_TOO_LONG', kind: 'VALIDATION' }),
    );
    expect(register('x'.repeat(100), 'awa@example.sn').name).toHaveLength(100);
  });

  it.each(['', 'awa', 'awa@', '@example.sn', 'awa example.sn'])(
    '001-AS8: rejects a malformed email (%j)',
    (email) => {
      expect(() => register('Awa', email)).toThrow(
        expect.objectContaining({ code: 'VOLUNTEER_EMAIL_INVALID', kind: 'VALIDATION' }),
      );
    },
  );
});
