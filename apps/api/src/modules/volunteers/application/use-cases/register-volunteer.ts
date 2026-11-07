import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { RegisterVolunteerInput } from '@joj/shared';
import type { Registration } from '../../domain/registration';
import type { Slot } from '../../domain/slot';
import { slotNotFound } from '../../domain/volunteers.errors';
import { SlotRepository } from '../slot.repository';

export interface RegisteredVolunteer {
  registration: Registration;
  /** Le créneau après l'inscription, pour connaître ses places restantes. */
  slot: Slot;
}

@Injectable()
export class RegisterVolunteer {
  constructor(private readonly slots: SlotRepository) {}

  async execute(slotId: string, input: RegisterVolunteerInput): Promise<RegisteredVolunteer> {
    const slot = await this.slots.findById(slotId);
    if (!slot) throw slotNotFound(slotId);
    // Message clair dans le cas courant ; le dépôt revérifie la place pour deux inscriptions simultanées.
    const registration = slot.register({
      id: randomUUID(),
      name: input.name,
      email: input.email,
      now: new Date(),
    });
    await this.slots.addRegistration(slot, registration);
    return { registration, slot };
  }
}
