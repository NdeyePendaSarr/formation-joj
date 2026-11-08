import type { SportEvent } from '../../domain/sport-event';
import { SportEventRepository } from '../sport-event.repository';

/** Les épreuves sont données au constructeur, comme les données de départ en base. */
export class InMemorySportEventRepository extends SportEventRepository {
  private readonly rows: Map<string, SportEvent>;

  constructor(events: SportEvent[] = []) {
    super();
    this.rows = new Map(events.map((event) => [event.id, event]));
  }

  async findById(id: string): Promise<SportEvent | null> {
    // Une épreuve n'a aucune méthode qui la modifie : la partager sans copie est sans risque.
    return this.rows.get(id) ?? null;
  }
}
