import { describe, expect, it } from 'vitest';
import { Podium } from './podium';
import { SportEvent } from './sport-event';

const OFFICIAL = Podium.create({ gold: 214, silver: 108, bronze: 331 });

const girls100m = () =>
  SportEvent.restore({
    id: '0199f5c3-0000-7000-8000-000000000001',
    name: '100 m filles',
    officialResult: OFFICIAL,
  });

const boys200m = () =>
  SportEvent.restore({
    id: '0199f5c3-0000-7000-8000-000000000002',
    name: '200 m garçons',
    officialResult: null,
  });

describe('SportEvent', () => {
  it('002-AS1: certifies a podium identical to the official result', () => {
    expect(() =>
      girls100m().certify(Podium.create({ gold: 214, silver: 108, bronze: 331 })),
    ).not.toThrow();
  });

  it.each([
    { gold: 108, silver: 214, bronze: 331 },
    { gold: 214, silver: 108, bronze: 999 },
  ])('002-AS3: rejects a podium that contradicts the official result (%j)', (bibs) => {
    expect(() => girls100m().certify(Podium.create(bibs))).toThrow(
      expect.objectContaining({ code: 'PODIUM_CONTRADICTS_OFFICIAL', kind: 'CONFLICT' }),
    );
  });

  it('002-AS4: rejects any podium when the official result is unknown', () => {
    expect(() =>
      boys200m().certify(Podium.create({ gold: 214, silver: 108, bronze: 331 })),
    ).toThrow(expect.objectContaining({ code: 'OFFICIAL_RESULT_UNKNOWN', kind: 'CONFLICT' }));
  });
});
