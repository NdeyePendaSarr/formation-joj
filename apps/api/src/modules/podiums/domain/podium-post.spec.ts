import { describe, expect, it } from 'vitest';
import { Podium } from './podium';
import { PodiumPost } from './podium-post';
import { SportEvent } from './sport-event';

const ID = '0199f5c3-0000-7000-8000-000000000101';
const EVENT_ID = '0199f5c3-0000-7000-8000-000000000001';
const NOW = new Date('2026-11-07T10:00:00.000Z');

const girls100m = SportEvent.restore({
  id: EVENT_ID,
  name: '100 m filles',
  officialResult: Podium.create({ gold: 214, silver: 108, bronze: 331 }),
});

const publish = (journalistName: string, bibs = { gold: 214, silver: 108, bronze: 331 }) =>
  PodiumPost.publish({
    id: ID,
    event: girls100m,
    journalistName,
    podium: Podium.create(bibs),
    postedAt: NOW,
  });

describe('PodiumPost', () => {
  it('002-AS1: publishes a matching podium as VALIDE with the journalist name and the bibs', () => {
    const post = publish('  Awa  ');
    expect(post).toMatchObject({
      id: ID,
      eventId: EVENT_ID,
      journalistName: 'Awa',
      status: 'VALIDE',
      postedAt: NOW,
    });
    expect(post.podium).toMatchObject({ gold: 214, silver: 108, bronze: 331 });
  });

  it('002-AS3: refuses to publish a podium that contradicts the official result', () => {
    expect(() => publish('Awa', { gold: 108, silver: 214, bronze: 331 })).toThrow(
      expect.objectContaining({ code: 'PODIUM_CONTRADICTS_OFFICIAL', kind: 'CONFLICT' }),
    );
  });

  it.each(['', '   '])('002-AS7: rejects a journalist without a name (%j)', (name) => {
    expect(() => publish(name)).toThrow(
      expect.objectContaining({ code: 'JOURNALIST_NAME_REQUIRED', kind: 'VALIDATION' }),
    );
  });

  it('002-AS7: rejects a name of 101 characters and accepts 100', () => {
    expect(() => publish('x'.repeat(101))).toThrow(
      expect.objectContaining({ code: 'JOURNALIST_NAME_TOO_LONG', kind: 'VALIDATION' }),
    );
    expect(publish('x'.repeat(100)).journalistName).toHaveLength(100);
  });

  it('002-AS7: rejects a name containing a NUL character', () => {
    expect(() => publish('Awa\u0000')).toThrow(
      expect.objectContaining({ code: 'JOURNALIST_NAME_INVALID', kind: 'VALIDATION' }),
    );
  });
});
