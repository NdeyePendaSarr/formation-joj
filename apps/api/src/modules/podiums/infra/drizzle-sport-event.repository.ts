import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Database } from '../../../core/database/database';
import { DATABASE } from '../../../core/database/database.module';
import { SportEventRepository } from '../application/sport-event.repository';
import type { SportEvent } from '../domain/sport-event';
import { events } from './podiums.schema';
import { toDomain } from './sport-event.mapper';

@Injectable()
export class DrizzleSportEventRepository extends SportEventRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async findById(id: string): Promise<SportEvent | null> {
    const [row] = await this.db.select().from(events).where(eq(events.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }
}
