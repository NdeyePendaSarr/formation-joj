import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { OpenSlotInput } from '@joj/shared';
import { Slot } from '../../domain/slot';
import { slotDisciplineNotFound } from '../../domain/volunteers.errors';
import { DisciplineLookup } from '../discipline-lookup';
import { SlotRepository } from '../slot.repository';

@Injectable()
export class OpenSlot {
  constructor(
    private readonly slots: SlotRepository,
    private readonly disciplines: DisciplineLookup,
  ) {}

  async execute(input: OpenSlotInput): Promise<Slot> {
    const slot = Slot.create({
      id: randomUUID(),
      disciplineId: input.disciplineId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      capacity: input.capacity,
    });
    // Pas de clé étrangère vers les disciplines (voir le plan 001) : la vérification est ici.
    if (!(await this.disciplines.exists(slot.disciplineId))) {
      throw slotDisciplineNotFound(slot.disciplineId);
    }
    await this.slots.insert(slot);
    return slot;
  }
}
