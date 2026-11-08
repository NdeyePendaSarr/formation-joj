import { describe, expect, it } from 'vitest';
import { Podium } from './podium';
import { PodiumError } from './podiums.errors';

describe('Podium', () => {
  it('002-AS1: keeps the three bibs in the order gold, silver, bronze', () => {
    expect(Podium.create({ gold: 214, silver: 108, bronze: 331 })).toMatchObject({
      gold: 214,
      silver: 108,
      bronze: 331,
    });
  });

  it('002-AS1: equals a podium with the same bibs in the same order', () => {
    const official = Podium.create({ gold: 214, silver: 108, bronze: 331 });
    expect(Podium.create({ gold: 214, silver: 108, bronze: 331 }).equals(official)).toBe(true);
  });

  it('002-AS3: differs from a podium with swapped places or another athlete', () => {
    const official = Podium.create({ gold: 214, silver: 108, bronze: 331 });
    expect(Podium.create({ gold: 108, silver: 214, bronze: 331 }).equals(official)).toBe(false);
    expect(Podium.create({ gold: 214, silver: 108, bronze: 999 }).equals(official)).toBe(false);
  });

  it.each([0, -1, 1.5, 2_147_483_648])(
    '002-AS7: rejects a bib that is not storable (%j)',
    (bib) => {
      expect(() => Podium.create({ gold: bib, silver: 108, bronze: 331 })).toThrow(PodiumError);
      expect(() => Podium.create({ gold: 214, silver: 108, bronze: bib })).toThrow(
        expect.objectContaining({ code: 'PODIUM_BIB_INVALID', kind: 'VALIDATION' }),
      );
    },
  );

  it('002-AS7: accepts the largest storable bib', () => {
    expect(Podium.create({ gold: 2_147_483_647, silver: 108, bronze: 331 }).gold).toBe(
      2_147_483_647,
    );
  });

  it.each([
    { gold: 214, silver: 214, bronze: 331 },
    { gold: 214, silver: 108, bronze: 214 },
    { gold: 214, silver: 108, bronze: 108 },
  ])('002-AS7: rejects a bib at two places (%j)', (bibs) => {
    expect(() => Podium.create(bibs)).toThrow(
      expect.objectContaining({ code: 'PODIUM_BIBS_NOT_DISTINCT', kind: 'VALIDATION' }),
    );
  });
});
