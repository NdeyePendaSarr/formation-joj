import type { Slot } from '../domain/slot';

/**
 * Port de persistance des créneaux : ce dont les cas d'usage ont besoin, rien de plus.
 * Implémenté par DrizzleSlotRepository (infra) et InMemorySlotRepository (tests).
 */
export abstract class SlotRepository {
  abstract findById(id: string): Promise<Slot | null>;
  abstract insert(slot: Slot): Promise<void>;
}
