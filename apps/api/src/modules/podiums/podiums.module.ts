import { Module } from '@nestjs/common';
import { PodiumPostRepository } from './application/podium-post.repository';
import { SportEventRepository } from './application/sport-event.repository';
import { ListEventPosts } from './application/use-cases/list-event-posts';
import { PostPodium } from './application/use-cases/post-podium';
import { EventPodiumsController } from './http/event-podiums.controller';
import { DrizzlePodiumPostRepository } from './infra/drizzle-podium-post.repository';
import { DrizzleSportEventRepository } from './infra/drizzle-sport-event.repository';

@Module({
  controllers: [EventPodiumsController],
  providers: [
    // Les ports (classes abstraites) sont reliés ici à leurs implémentations Drizzle.
    { provide: SportEventRepository, useClass: DrizzleSportEventRepository },
    { provide: PodiumPostRepository, useClass: DrizzlePodiumPostRepository },
    PostPodium,
    ListEventPosts,
  ],
})
export class PodiumsModule {}
