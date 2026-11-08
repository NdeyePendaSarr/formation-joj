import { z } from 'zod';
import { hasNulCharacter } from './volunteers.ts';

export const JOURNALIST_NAME_MAX_LENGTH = 100;
/** Limite technique, pas métier : le plus grand entier d'une colonne `integer` Postgres. */
export const PODIUM_BIB_MAX = 2_147_483_647;

/** Vrai si l'or, l'argent et le bronze sont trois dossards différents. Relu par le domaine. */
export function hasDistinctBibs(bibs: { gold: number; silver: number; bronze: number }): boolean {
  return new Set([bibs.gold, bibs.silver, bibs.bronze]).size === 3;
}

const bibSchema = z.int().min(1).max(PODIUM_BIB_MAX);

/** Corps de `POST /api/epreuves/:id/podiums`. */
export const postPodiumSchema = z
  .object({
    journalistName: z
      .string()
      .trim()
      .min(1)
      .max(JOURNALIST_NAME_MAX_LENGTH)
      .refine((name) => !hasNulCharacter(name), { message: 'The name contains a NUL character' }),
    gold: bibSchema,
    silver: bibSchema,
    bronze: bibSchema,
  })
  .refine(hasDistinctBibs, { message: 'A bib cannot hold two places', path: ['bronze'] });
export type PostPodiumInput = z.infer<typeof postPodiumSchema>;

/** Paramètre `:id` des routes d'une épreuve. */
export const eventIdParamsSchema = z.object({ id: z.uuid() });

/** Seul statut de la tranche 1 : PROVISOIRE et REJETE viendront avec la tranche 2. */
export const podiumPostStatusSchema = z.enum(['VALIDE']);
export type PodiumPostStatus = z.infer<typeof podiumPostStatusSchema>;

/** Un post tel que l'API le renvoie. */
export const podiumPostSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  journalistName: z.string(),
  gold: bibSchema,
  silver: bibSchema,
  bronze: bibSchema,
  status: podiumPostStatusSchema,
  postedAt: z.iso.datetime(),
});
export type PodiumPostResponse = z.infer<typeof podiumPostSchema>;

/** Les posts d'une épreuve, du plus ancien au plus récent. */
export const podiumPostListSchema = z.array(podiumPostSchema);
