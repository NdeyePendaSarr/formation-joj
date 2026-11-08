import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PostPodiumInput } from '@joj/shared';
import { Podium } from '../../domain/podium';
import { PodiumPost } from '../../domain/podium-post';
import { eventNotFound } from '../../domain/podiums.errors';
import { PodiumPostRepository } from '../podium-post.repository';
import { SportEventRepository } from '../sport-event.repository';

@Injectable()
export class PostPodium {
  constructor(
    private readonly events: SportEventRepository,
    private readonly posts: PodiumPostRepository,
  ) {}

  async execute(eventId: string, input: PostPodiumInput): Promise<PodiumPost> {
    const event = await this.events.findById(eventId);
    if (!event) throw eventNotFound(eventId);

    // `publish()` lève une erreur si le podium n'est pas certifié : rien n'est alors enregistré.
    const post = PodiumPost.publish({
      id: randomUUID(),
      event,
      journalistName: input.journalistName,
      podium: Podium.create({ gold: input.gold, silver: input.silver, bronze: input.bronze }),
      postedAt: new Date(),
    });
    await this.posts.insert(post);
    return post;
  }
}
