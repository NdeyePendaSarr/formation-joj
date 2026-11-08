import { describe, expect, it } from 'vitest';
import { Podium } from '../domain/podium';
import { SportEvent } from '../domain/sport-event';
import { InMemoryPodiumPostRepository } from './testing/in-memory-podium-post.repository';
import { InMemorySportEventRepository } from './testing/in-memory-sport-event.repository';
import { ListEventPosts } from './use-cases/list-event-posts';
import { PostPodium } from './use-cases/post-podium';

const GIRLS_100M = '0199f5c3-0000-7000-8000-000000000001';
const BOYS_200M = '0199f5c3-0000-7000-8000-000000000002';
const UNKNOWN = '0199f5c3-0000-7000-8000-0000000000ff';

function setup() {
  const events = new InMemorySportEventRepository([
    SportEvent.restore({
      id: GIRLS_100M,
      name: '100 m filles',
      officialResult: Podium.create({ gold: 214, silver: 108, bronze: 331 }),
    }),
    SportEvent.restore({ id: BOYS_200M, name: '200 m garçons', officialResult: null }),
  ]);
  const posts = new InMemoryPodiumPostRepository();
  return {
    posts,
    postPodium: new PostPodium(events, posts),
    listEventPosts: new ListEventPosts(events, posts),
  };
}

const awaPodium = { journalistName: 'Awa', gold: 214, silver: 108, bronze: 331 };

describe('podiums (application layer)', () => {
  it('002-AS1: publishes a matching podium as VALIDE and stores it', async () => {
    const { posts, postPodium } = setup();
    const post = await postPodium.execute(GIRLS_100M, awaPodium);

    expect(post.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(post).toMatchObject({ eventId: GIRLS_100M, journalistName: 'Awa', status: 'VALIDE' });
    expect(post.podium).toMatchObject({ gold: 214, silver: 108, bronze: 331 });
    expect(await posts.listByEvent(GIRLS_100M)).toEqual([post]);
  });

  it('002-AS2: lists the published posts of an event, and nothing for an event without post', async () => {
    const { postPodium, listEventPosts } = setup();
    const post = await postPodium.execute(GIRLS_100M, awaPodium);

    expect(await listEventPosts.execute(GIRLS_100M)).toEqual([post]);
    expect(await listEventPosts.execute(BOYS_200M)).toEqual([]);
  });

  it.each([
    { gold: 108, silver: 214, bronze: 331 },
    { gold: 214, silver: 108, bronze: 999 },
  ])('002-AS3: rejects a contradicting podium and stores nothing (%j)', async (bibs) => {
    const { posts, postPodium } = setup();

    await expect(
      postPodium.execute(GIRLS_100M, { journalistName: 'Awa', ...bibs }),
    ).rejects.toMatchObject({ code: 'PODIUM_CONTRADICTS_OFFICIAL' });
    expect(await posts.listByEvent(GIRLS_100M)).toEqual([]);
  });

  it('002-AS4: rejects a podium for an event without official result and stores nothing', async () => {
    const { posts, postPodium } = setup();

    await expect(postPodium.execute(BOYS_200M, awaPodium)).rejects.toMatchObject({
      code: 'OFFICIAL_RESULT_UNKNOWN',
    });
    expect(await posts.listByEvent(BOYS_200M)).toEqual([]);
  });

  it('002-AS5: rejects an unknown event, to post as well as to list', async () => {
    const { postPodium, listEventPosts } = setup();

    await expect(postPodium.execute(UNKNOWN, awaPodium)).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
      kind: 'NOT_FOUND',
    });
    await expect(listEventPosts.execute(UNKNOWN)).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
      kind: 'NOT_FOUND',
    });
  });
});
