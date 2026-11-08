import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../../core/database/database';
import { DATABASE } from '../../../core/database/database.module';
import { PodiumPostRepository } from '../application/podium-post.repository';
import type { PodiumPost } from '../domain/podium-post';
import { toDomain, toRow } from './podium-post.mapper';
import { podiumPosts } from './podiums.schema';

@Injectable()
export class DrizzlePodiumPostRepository extends PodiumPostRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async insert(post: PodiumPost): Promise<void> {
    await this.db.insert(podiumPosts).values(toRow(post));
  }

  async listByEvent(eventId: string): Promise<PodiumPost[]> {
    const rows = await this.db
      .select()
      .from(podiumPosts)
      .where(eq(podiumPosts.eventId, eventId))
      // `seq` et non `posted_at` : deux posts de la même milliseconde gardent leur ordre.
      .orderBy(asc(podiumPosts.seq));
    return rows.map(toDomain);
  }
}
