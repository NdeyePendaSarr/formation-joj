import { Injectable } from '@nestjs/common';
import { DISCIPLINE_CATEGORIES, type DisciplineCountResponse } from '@joj/shared';
import { DisciplineRepository } from '../discipline.repository';

/** Les cinq catégories dans l'ordre de la liste, avec leur nombre de disciplines (0 compris). */
@Injectable()
export class CountDisciplinesByCategory {
  constructor(private readonly disciplines: DisciplineRepository) {}

  async execute(): Promise<DisciplineCountResponse[]> {
    // La base ne connaît que les catégories utilisées : les autres valent 0.
    const counts = await this.disciplines.countByCategory();
    return DISCIPLINE_CATEGORIES.map((category) => ({
      category,
      count: counts.get(category) ?? 0,
    }));
  }
}
