import { podiumPostStatusSchema } from '@joj/shared';
import { Podium } from '../domain/podium';
import { PodiumPost } from '../domain/podium-post';
import type { PodiumPostRow } from './podiums.schema';

/** Ligne de la table → post. */
export function toDomain(row: PodiumPostRow): PodiumPost {
  return PodiumPost.restore({
    id: row.id,
    eventId: row.eventId,
    journalistName: row.journalistName,
    podium: Podium.create({ gold: row.goldBib, silver: row.silverBib, bronze: row.bronzeBib }),
    // La contrainte `podium_posts_status_check` le garantit ; le schéma le dit au typage.
    status: podiumPostStatusSchema.parse(row.status),
    postedAt: row.postedAt,
  });
}

/** Post → ligne de la table, sans `seq` : c'est la base qui le donne. */
export function toRow(post: PodiumPost): Omit<PodiumPostRow, 'seq'> {
  return {
    id: post.id,
    eventId: post.eventId,
    journalistName: post.journalistName,
    goldBib: post.podium.gold,
    silverBib: post.podium.silver,
    bronzeBib: post.podium.bronze,
    status: post.status,
    postedAt: post.postedAt,
  };
}
