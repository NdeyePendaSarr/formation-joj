import { hasNulCharacter, JOURNALIST_NAME_MAX_LENGTH, type PodiumPostStatus } from '@joj/shared';
import type { Podium } from './podium';
import { PodiumError } from './podiums.errors';
import type { SportEvent } from './sport-event';

export interface PodiumPostProps {
  id: string;
  eventId: string;
  journalistName: string;
  podium: Podium;
  status: PodiumPostStatus;
  postedAt: Date;
}

export interface NewPodiumPost {
  id: string;
  event: SportEvent;
  journalistName: string;
  podium: Podium;
  postedAt: Date;
}

/** Un podium publié par un journaliste pour une épreuve. Il ne se modifie pas. */
export class PodiumPost {
  private constructor(private readonly props: PodiumPostProps) {}

  /** Publie le podium seulement s'il est certifié par le résultat officiel de l'épreuve. */
  static publish({ id, event, journalistName, podium, postedAt }: NewPodiumPost): PodiumPost {
    const name = validJournalistName(journalistName);
    event.certify(podium);
    return new PodiumPost({
      id,
      eventId: event.id,
      journalistName: name,
      podium,
      status: 'VALIDE',
      postedAt,
    });
  }

  /** Reconstruit un post depuis la persistance, sans rejouer les règles de publication. */
  static restore(props: PodiumPostProps): PodiumPost {
    return new PodiumPost({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get eventId(): string {
    return this.props.eventId;
  }

  get journalistName(): string {
    return this.props.journalistName;
  }

  get podium(): Podium {
    return this.props.podium;
  }

  get status(): PodiumPostStatus {
    return this.props.status;
  }

  get postedAt(): Date {
    return this.props.postedAt;
  }
}

function validJournalistName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new PodiumError('JOURNALIST_NAME_REQUIRED', 'A journalist needs a name');
  }
  if (trimmed.length > JOURNALIST_NAME_MAX_LENGTH) {
    throw new PodiumError(
      'JOURNALIST_NAME_TOO_LONG',
      `A journalist name has at most ${JOURNALIST_NAME_MAX_LENGTH} characters`,
    );
  }
  if (hasNulCharacter(trimmed)) {
    throw new PodiumError('JOURNALIST_NAME_INVALID', 'A journalist name has no NUL character');
  }
  return trimmed;
}
