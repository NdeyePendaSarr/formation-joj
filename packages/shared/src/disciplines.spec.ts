import { describe, expect, it } from 'vitest';
import {
  createDisciplineSchema,
  disciplineCountsByCategorySchema,
  updateDisciplineSchema,
} from './disciplines.ts';

describe('createDisciplineSchema', () => {
  it('000-AS1: accepts a name and a listed category, and trims the name', () => {
    expect(
      createDisciplineSchema.parse({ name: '  Lutte ', category: 'sports-de-combat' }),
    ).toEqual({ name: 'Lutte', category: 'sports-de-combat' });
  });

  it.each(['', '   '])('000-AS2: rejects a discipline without a name (%j)', (name) => {
    expect(createDisciplineSchema.safeParse({ name, category: 'athletisme' }).success).toBe(false);
  });

  it('000-AS3: rejects a category outside the list', () => {
    expect(createDisciplineSchema.safeParse({ name: 'Échecs', category: 'jeux' }).success).toBe(
      false,
    );
  });
});

describe('updateDisciplineSchema', () => {
  it('000-AS7: accepts a new name, a new category, or both', () => {
    expect(updateDisciplineSchema.parse({ name: ' Lutte ' })).toEqual({ name: 'Lutte' });
    expect(updateDisciplineSchema.parse({ category: 'athletisme' })).toEqual({
      category: 'athletisme',
    });
  });

  it.each([{ name: ' ' }, { category: 'jeux' }, {}])(
    '000-AS8: rejects an empty name, an unlisted category or an empty update (%j)',
    (body) => {
      expect(updateDisciplineSchema.safeParse(body).success).toBe(false);
    },
  );
});

describe('disciplineCountsByCategorySchema', () => {
  it('000-AS5: accepts a count per category, 0 included', () => {
    const counts = [
      { category: 'sports-de-combat', count: 2 },
      { category: 'athletisme', count: 0 },
    ];
    expect(disciplineCountsByCategorySchema.parse(counts)).toEqual(counts);
  });

  it.each([
    { category: 'jeux', count: 1 },
    { category: 'athletisme', count: -1 },
    { category: 'athletisme', count: 1.5 },
  ])('000-AS5: rejects an unknown category or a count that is not a natural number (%j)', (row) => {
    expect(disciplineCountsByCategorySchema.safeParse([row]).success).toBe(false);
  });
});
