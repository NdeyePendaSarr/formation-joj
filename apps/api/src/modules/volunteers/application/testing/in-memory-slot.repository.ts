import { Slot } from '../../domain/slot';
import { SlotRepository } from '../slot.repository';

/** Fake fidèle au contrat du port, pour tester l'application sans base. */
export class InMemorySlotRepository extends SlotRepository {
  private readonly rows = new Map<string, Slot>();

  async findById(id: string): Promise<Slot | null> {
    const found = this.rows.get(id);
    return found ? clone(found) : null;
  }

  async insert(slot: Slot): Promise<void> {
    this.rows.set(slot.id, clone(slot));
  }

  /** Pour les tests : tout ce qui a été enregistré. */
  all(): Slot[] {
    return [...this.rows.values()].map(clone);
  }
}

/** Copie : un test ne voit pas une modification qui n'a pas été persistée. */
function clone(slot: Slot): Slot {
  return Slot.restore({
    id: slot.id,
    disciplineId: slot.disciplineId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    registeredCount: slot.registeredCount,
  });
}
