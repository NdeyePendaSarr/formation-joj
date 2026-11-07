import type { Registration } from '../domain/registration';
import type { Slot } from '../domain/slot';

/**
 * Port de persistance des créneaux : ce dont les cas d'usage ont besoin, rien de plus.
 * Implémenté par DrizzleSlotRepository (infra) et InMemorySlotRepository (tests).
 */
export abstract class SlotRepository {
  abstract findById(id: string): Promise<Slot | null>;
  abstract insert(slot: Slot): Promise<void>;
  /**
   * Enregistre l'inscription et compte une place de plus, d'un seul bloc. Lève SLOT_FULL si le
   * créneau stocké n'a plus de place : il a pu se remplir depuis que `slot` a été lu.
   * Renvoie le créneau tel qu'il est écrit : `slot` a pu vieillir, ses places restantes aussi.
   */
  abstract addRegistration(slot: Slot, registration: Registration): Promise<Slot>;
}
