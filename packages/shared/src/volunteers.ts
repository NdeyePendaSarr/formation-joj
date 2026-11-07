import { z } from 'zod';

export const SLOT_MIN_CAPACITY = 1;
/** Limite technique, pas métier : le plus grand entier de la colonne `capacity` (integer Postgres). */
export const SLOT_MAX_CAPACITY = 2_147_483_647;
export const VOLUNTEER_NAME_MAX_LENGTH = 100;

/** Corps de `POST /api/creneaux`. */
export const openSlotSchema = z
  .object({
    disciplineId: z.uuid(),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    capacity: z.int().min(SLOT_MIN_CAPACITY).max(SLOT_MAX_CAPACITY),
  })
  .refine((input) => Date.parse(input.endsAt) > Date.parse(input.startsAt), {
    message: 'The end must follow the start',
    path: ['endsAt'],
  });
export type OpenSlotInput = z.infer<typeof openSlotSchema>;

/** Une seule définition d'un email bien formé, relue par le domaine de l'API. */
export const volunteerEmailSchema = z.email();

/** Corps de `POST /api/creneaux/:id/inscriptions`. */
export const registerVolunteerSchema = z.object({
  name: z.string().trim().min(1).max(VOLUNTEER_NAME_MAX_LENGTH),
  email: volunteerEmailSchema,
});
export type RegisterVolunteerInput = z.infer<typeof registerVolunteerSchema>;

/** Paramètre `:id` des routes d'un créneau. */
export const slotIdParamsSchema = z.object({ id: z.uuid() });

/** Un créneau tel que l'API le renvoie. */
export const slotSchema = z.object({
  id: z.uuid(),
  disciplineId: z.uuid(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  capacity: z.int().min(SLOT_MIN_CAPACITY),
  registeredCount: z.int().nonnegative(),
});
export type SlotResponse = z.infer<typeof slotSchema>;

/** Une inscription telle que l'API la renvoie, avec les places restantes du créneau. */
export const registrationSchema = z.object({
  id: z.uuid(),
  slotId: z.uuid(),
  name: z.string(),
  email: volunteerEmailSchema,
  registeredAt: z.iso.datetime(),
  remainingPlaces: z.int().nonnegative(),
});
export type RegistrationResponse = z.infer<typeof registrationSchema>;
