import { Registration } from '../domain/registration';
import { Slot } from '../domain/slot';
import type { RegistrationRow, SlotRow } from './volunteers.schema';

/** Ligne de la table → créneau. */
export function toDomain(row: SlotRow): Slot {
  return Slot.restore({
    id: row.id,
    disciplineId: row.disciplineId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    capacity: row.capacity,
    registeredCount: row.registeredCount,
  });
}

/** Créneau → ligne de la table. */
export function toRow(slot: Slot): SlotRow {
  return {
    id: slot.id,
    disciplineId: slot.disciplineId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    registeredCount: slot.registeredCount,
  };
}

/** Ligne de la table → inscription. */
export function registrationToDomain(row: RegistrationRow): Registration {
  return Registration.restore({ ...row });
}

/** Inscription → ligne de la table. */
export function registrationToRow(registration: Registration): RegistrationRow {
  return {
    id: registration.id,
    slotId: registration.slotId,
    name: registration.name,
    email: registration.email,
    registeredAt: registration.registeredAt,
  };
}
