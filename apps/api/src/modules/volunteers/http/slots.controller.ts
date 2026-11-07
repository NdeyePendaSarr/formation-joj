import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  openSlotSchema,
  registerVolunteerSchema,
  type RegistrationResponse,
  registrationSchema,
  slotIdParamsSchema,
  type SlotResponse,
  slotSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { OpenSlot } from '../application/use-cases/open-slot';
import { RegisterVolunteer } from '../application/use-cases/register-volunteer';
import type { Slot } from '../domain/slot';

class OpenSlotDto extends createZodDto(openSlotSchema) {}
class RegisterVolunteerDto extends createZodDto(registerVolunteerSchema) {}
class SlotIdParamsDto extends createZodDto(slotIdParamsSchema) {}
class SlotDto extends createZodDto(slotSchema) {}
class RegistrationDto extends createZodDto(registrationSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('creneaux')
@Controller('creneaux')
export class SlotsController {
  constructor(
    private readonly openSlot: OpenSlot,
    private readonly registerVolunteer: RegisterVolunteer,
  ) {}

  @Post()
  @ZodSerializerDto(SlotDto)
  async open(@Body() body: OpenSlotDto): Promise<SlotResponse> {
    return toSlotResponse(await this.openSlot.execute(body));
  }

  @Post(':id/inscriptions')
  @ZodSerializerDto(RegistrationDto)
  async register(
    @Param() { id }: SlotIdParamsDto,
    @Body() body: RegisterVolunteerDto,
  ): Promise<RegistrationResponse> {
    const { registration, slot } = await this.registerVolunteer.execute(id, body);
    return {
      id: registration.id,
      slotId: registration.slotId,
      name: registration.name,
      email: registration.email,
      registeredAt: registration.registeredAt.toISOString(),
      remainingPlaces: slot.remainingPlaces,
    };
  }
}

function toSlotResponse(slot: Slot): SlotResponse {
  return {
    id: slot.id,
    disciplineId: slot.disciplineId,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    capacity: slot.capacity,
    registeredCount: slot.registeredCount,
  };
}
