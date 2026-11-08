import type { SportEvent } from '../domain/sport-event';

/**
 * Port de lecture des épreuves : elles viennent des données de départ, on ne les écrit pas.
 * Implémenté par DrizzleSportEventRepository (infra) et InMemorySportEventRepository (tests).
 */
export abstract class SportEventRepository {
  abstract findById(id: string): Promise<SportEvent | null>;
}
