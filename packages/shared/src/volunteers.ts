import { z } from 'zod';

export const SLOT_MIN_CAPACITY = 1;
/** Limite technique, pas métier : le plus grand entier de la colonne `capacity` (integer Postgres). */
export const SLOT_MAX_CAPACITY = 2_147_483_647;
export const VOLUNTEER_NAME_MAX_LENGTH = 100;

/**
 * Limites techniques, pas métier : un instant des années 1 à 9999 en UTC. Postgres refuse l'an 0,
 * et au-delà de 9999 `toISOString()` écrit une année à six chiffres qu'il ne relit pas.
 */
export const SLOT_EARLIEST_INSTANT = Date.parse('0001-01-01T00:00:00.000Z');
export const SLOT_LATEST_INSTANT = Date.parse('9999-12-31T23:59:59.999Z');

/** Vrai si l'instant (en millisecondes) peut être stocké. Relu par le domaine de l'API. */
export function isStorableInstant(time: number): boolean {
  return time >= SLOT_EARLIEST_INSTANT && time <= SLOT_LATEST_INSTANT;
}

/** Postgres refuse le caractère U+0000 dans un texte. Relu par le domaine de l'API. */
export function hasNulCharacter(text: string): boolean {
  return text.includes('\u0000');
}

const slotInstantSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => isStorableInstant(Date.parse(value)), {
    message: 'The date must fall between years 1 and 9999 in UTC',
  });

/** Corps de `POST /api/creneaux`. */
export const openSlotSchema = z
  .object({
    disciplineId: z.uuid(),
    startsAt: slotInstantSchema,
    endsAt: slotInstantSchema,
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
  name: z
    .string()
    .trim()
    .min(1)
    .max(VOLUNTEER_NAME_MAX_LENGTH)
    .refine((name) => !hasNulCharacter(name), { message: 'The name contains a NUL character' }),
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
