import { DisciplineLookup } from '../discipline-lookup';

/** Les disciplines connues sont celles données au constructeur. */
export class InMemoryDisciplineLookup extends DisciplineLookup {
  constructor(private readonly ids: readonly string[] = []) {
    super();
  }

  async exists(disciplineId: string): Promise<boolean> {
    return this.ids.includes(disciplineId);
  }
}
