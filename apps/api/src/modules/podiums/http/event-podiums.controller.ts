import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  eventIdParamsSchema,
  type PodiumPostResponse,
  podiumPostSchema,
  postPodiumSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { ListEventPosts } from '../application/use-cases/list-event-posts';
import { PostPodium } from '../application/use-cases/post-podium';
import type { PodiumPost } from '../domain/podium-post';

class PostPodiumDto extends createZodDto(postPodiumSchema) {}
class EventIdParamsDto extends createZodDto(eventIdParamsSchema) {}
class PodiumPostDto extends createZodDto(podiumPostSchema) {}

/** Couche fine : valider (DTO zod), appeler un cas d'usage, sérialiser. Aucune règle métier ici. */
@ApiTags('epreuves')
@Controller('epreuves')
export class EventPodiumsController {
  constructor(
    private readonly postPodium: PostPodium,
    private readonly listEventPosts: ListEventPosts,
  ) {}

  @Post(':id/podiums')
  @ZodSerializerDto(PodiumPostDto)
  async post(
    @Param() { id }: EventIdParamsDto,
    @Body() body: PostPodiumDto,
  ): Promise<PodiumPostResponse> {
    return toPodiumPostResponse(await this.postPodium.execute(id, body));
  }

  @Get(':id/podiums')
  @ZodSerializerDto([PodiumPostDto])
  async list(@Param() { id }: EventIdParamsDto): Promise<PodiumPostResponse[]> {
    return (await this.listEventPosts.execute(id)).map(toPodiumPostResponse);
  }
}

function toPodiumPostResponse(post: PodiumPost): PodiumPostResponse {
  return {
    id: post.id,
    eventId: post.eventId,
    journalistName: post.journalistName,
    gold: post.podium.gold,
    silver: post.podium.silver,
    bronze: post.podium.bronze,
    status: post.status,
    postedAt: post.postedAt.toISOString(),
  };
}
