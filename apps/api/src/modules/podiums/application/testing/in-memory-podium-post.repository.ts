import type { PodiumPost } from '../../domain/podium-post';
import { PodiumPostRepository } from '../podium-post.repository';

/** Fake fidèle au contrat du port : les posts sont relus dans leur ordre d'insertion. */
export class InMemoryPodiumPostRepository extends PodiumPostRepository {
  // Un post ne se modifie pas : le garder sans copie est sans risque.
  private readonly rows: PodiumPost[] = [];

  async insert(post: PodiumPost): Promise<void> {
    this.rows.push(post);
  }

  async listByEvent(eventId: string): Promise<PodiumPost[]> {
    return this.rows.filter((post) => post.eventId === eventId);
  }
}
