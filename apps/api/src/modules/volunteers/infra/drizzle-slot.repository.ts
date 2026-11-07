import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lt, sql } from 'drizzle-orm';
import type { Database } from '../../../core/database/database';
import { DATABASE } from '../../../core/database/database.module';
import { SlotRepository } from '../application/slot.repository';
import type { Registration } from '../domain/registration';
import type { Slot } from '../domain/slot';
import { slotFull } from '../domain/volunteers.errors';
import { registrationToRow, toDomain, toRow } from './slot.mapper';
import { registrations, slots } from './volunteers.schema';

@Injectable()
export class DrizzleSlotRepository extends SlotRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async findById(id: string): Promise<Slot | null> {
    const [row] = await this.db.select().from(slots).where(eq(slots.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async insert(slot: Slot): Promise<void> {
    await this.db.insert(slots).values(toRow(slot));
  }

  async addRegistration(slot: Slot, registration: Registration): Promise<Slot> {
    // Une seule transaction : si l'insertion échoue, l'incrément est annulé et la place reste libre.
    return this.db.transaction(async (tx) => {
      // La place est revérifiée par la base au moment d'écrire, pas sur `slot` qui a pu vieillir :
      // l'UPDATE attend le verrou de la ligne puis réévalue sa condition. RETURNING donne le
      // compteur réellement écrit, d'où les places restantes annoncées.
      const [written] = await tx
        .update(slots)
        .set({ registeredCount: sql`${slots.registeredCount} + 1` })
        .where(and(eq(slots.id, slot.id), lt(slots.registeredCount, slots.capacity)))
        .returning();
      if (!written) throw slotFull(slot.id, slot.capacity);
      await tx.insert(registrations).values(registrationToRow(registration));
      return toDomain(written);
    });
  }
}
