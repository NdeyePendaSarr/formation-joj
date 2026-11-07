/**
 * Port vers le module Disciplines : savoir si une discipline existe, sans dépendre de son code.
 * Implémenté par DrizzleDisciplineLookup (infra) et InMemoryDisciplineLookup (tests).
 */
export abstract class DisciplineLookup {
  abstract exists(disciplineId: string): Promise<boolean>;
}
