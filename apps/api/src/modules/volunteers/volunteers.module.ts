import { Module } from '@nestjs/common';
import { DisciplineLookup } from './application/discipline-lookup';
import { SlotRepository } from './application/slot.repository';
import { OpenSlot } from './application/use-cases/open-slot';
import { RegisterVolunteer } from './application/use-cases/register-volunteer';
import { SlotsController } from './http/slots.controller';
import { DrizzleDisciplineLookup } from './infra/drizzle-discipline-lookup';
import { DrizzleSlotRepository } from './infra/drizzle-slot.repository';

@Module({
  controllers: [SlotsController],
  providers: [
    // Les ports (classes abstraites) sont reliés ici à leurs implémentations Drizzle.
    { provide: SlotRepository, useClass: DrizzleSlotRepository },
    { provide: DisciplineLookup, useClass: DrizzleDisciplineLookup },
    OpenSlot,
    RegisterVolunteer,
  ],
})
export class VolunteersModule {}
