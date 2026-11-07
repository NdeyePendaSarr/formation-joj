import { SLOT_MIN_CAPACITY } from '@joj/shared';
import { type NewRegistration, Registration } from './registration';
import { slotFull, VolunteerError } from './volunteers.errors';

export interface SlotProps {
  id: string;
  disciplineId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  registeredCount: number;
}

export interface NewSlot {
  id: string;
  /** L'existence de la discipline est vérifiée par le cas d'usage. */
  disciplineId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
}

/** Un créneau d'accueil d'une discipline : une fin après le début, au moins une place. */
export class Slot {
  private constructor(private props: SlotProps) {}

  // Le domaine revérifie ses règles : il ne fait pas confiance à la validation HTTP.
  static create({ id, disciplineId, startsAt, endsAt, capacity }: NewSlot): Slot {
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new VolunteerError('SLOT_END_NOT_AFTER_START', 'A slot must end after it starts', {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      });
    }
    if (!Number.isInteger(capacity) || capacity < SLOT_MIN_CAPACITY) {
      throw new VolunteerError(
        'SLOT_CAPACITY_INVALID',
        `A slot capacity is an integer of at least ${SLOT_MIN_CAPACITY}`,
        { capacity },
      );
    }
    return new Slot({ id, disciplineId, startsAt, endsAt, capacity, registeredCount: 0 });
  }

  /** Reconstruit un créneau depuis la persistance, sans rejouer les règles de création. */
  static restore(props: SlotProps): Slot {
    return new Slot({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get disciplineId(): string {
    return this.props.disciplineId;
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }

  get endsAt(): Date {
    return this.props.endsAt;
  }

  get capacity(): number {
    return this.props.capacity;
  }

  get registeredCount(): number {
    return this.props.registeredCount;
  }

  get remainingPlaces(): number {
    return this.props.capacity - this.props.registeredCount;
  }

  /**
   * Inscrit un bénévole s'il reste une place. Le dépôt revérifie la place au moment d'écrire :
   * deux inscriptions simultanées peuvent lire le même créneau.
   */
  register(volunteer: Omit<NewRegistration, 'slotId'>): Registration {
    const registration = Registration.create({ ...volunteer, slotId: this.props.id });
    if (this.remainingPlaces <= 0) throw slotFull(this.props.id, this.props.capacity);
    this.props = { ...this.props, registeredCount: this.props.registeredCount + 1 };
    return registration;
  }
}
