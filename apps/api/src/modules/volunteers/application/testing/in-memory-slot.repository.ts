import { Registration } from '../../domain/registration';
import { Slot } from '../../domain/slot';
import { slotFull } from '../../domain/volunteers.errors';
import { SlotRepository } from '../slot.repository';

/** Fake fidèle au contrat du port (place revérifiée à l'écriture), pour tester sans base. */
export class InMemorySlotRepository extends SlotRepository {
  private readonly rows = new Map<string, Slot>();
  private readonly registrations: Registration[] = [];

  async findById(id: string): Promise<Slot | null> {
    const found = this.rows.get(id);
    return found ? clone(found) : null;
  }

  async insert(slot: Slot): Promise<void> {
    this.rows.set(slot.id, clone(slot));
  }

  async addRegistration(slot: Slot, registration: Registration): Promise<void> {
    const stored = this.rows.get(slot.id);
    if (!stored) return;
    // Comme la mise à jour conditionnelle en base : c'est l'état stocké qui décide, pas `slot`.
    if (stored.remainingPlaces <= 0) throw slotFull(stored.id, stored.capacity);
    this.rows.set(
      stored.id,
      Slot.restore({ ...snapshot(stored), registeredCount: stored.registeredCount + 1 }),
    );
    this.registrations.push(cloneRegistration(registration));
  }

  /** Pour les tests : tout ce qui a été enregistré. */
  all(): Slot[] {
    return [...this.rows.values()].map(clone);
  }

  /** Pour les tests : les inscriptions d'un créneau, dans l'ordre d'arrivée. */
  registrationsOf(slotId: string): Registration[] {
    return this.registrations.filter((r) => r.slotId === slotId).map(cloneRegistration);
  }
}

function snapshot(slot: Slot) {
  return {
    id: slot.id,
    disciplineId: slot.disciplineId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    registeredCount: slot.registeredCount,
  };
}

/** Copie : un test ne voit pas une modification qui n'a pas été persistée. */
function clone(slot: Slot): Slot {
  return Slot.restore(snapshot(slot));
}

function cloneRegistration(registration: Registration): Registration {
  return Registration.restore({
    id: registration.id,
    slotId: registration.slotId,
    name: registration.name,
    email: registration.email,
    registeredAt: registration.registeredAt,
  });
}
