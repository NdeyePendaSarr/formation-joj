import { Injectable } from '@nestjs/common';
import type { PodiumPost } from '../../domain/podium-post';
import { eventNotFound } from '../../domain/podiums.errors';
import { PodiumPostRepository } from '../podium-post.repository';
import { SportEventRepository } from '../sport-event.repository';

@Injectable()
export class ListEventPosts {
  constructor(
    private readonly events: SportEventRepository,
    private readonly posts: PodiumPostRepository,
  ) {}

  /** Les posts de l'épreuve, du plus ancien au plus récent. */
  async execute(eventId: string): Promise<PodiumPost[]> {
    // Une épreuve inconnue est un 404, pas une liste vide : on la distingue d'une épreuve sans post.
    if (!(await this.events.findById(eventId))) throw eventNotFound(eventId);
    return this.posts.listByEvent(eventId);
  }
}
