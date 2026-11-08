import type { PodiumPost } from '../domain/podium-post';

/**
 * Port de persistance des posts : ce dont les cas d'usage ont besoin, rien de plus.
 * Implémenté par DrizzlePodiumPostRepository (infra) et InMemoryPodiumPostRepository (tests).
 */
export abstract class PodiumPostRepository {
  abstract insert(post: PodiumPost): Promise<void>;
  /** Les posts de l'épreuve, dans l'ordre de publication. */
  abstract listByEvent(eventId: string): Promise<PodiumPost[]>;
}
