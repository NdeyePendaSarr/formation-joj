import { AppError, type ErrorKind } from '../../../core/errors/app-error';

/** Codes stables exposés aux clients ; la catégorie décide du statut HTTP. */
const VOLUNTEER_ERROR_KINDS = {
  /** La fin du créneau est égale ou antérieure à son début. */
  SLOT_END_NOT_AFTER_START: 'VALIDATION',
  /** Capacité inférieure à 1, ou non entière. */
  SLOT_CAPACITY_INVALID: 'VALIDATION',
  /** Le créneau compte déjà autant d'inscrits que de places. */
  SLOT_FULL: 'CONFLICT',
  /** Nom vide, ou fait seulement d'espaces. */
  VOLUNTEER_NAME_REQUIRED: 'VALIDATION',
  VOLUNTEER_NAME_TOO_LONG: 'VALIDATION',
  VOLUNTEER_EMAIL_INVALID: 'VALIDATION',
} as const satisfies Record<string, ErrorKind>;

export type VolunteerErrorCode = keyof typeof VOLUNTEER_ERROR_KINDS;

export class VolunteerError extends AppError<VolunteerErrorCode> {
  constructor(code: VolunteerErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, VOLUNTEER_ERROR_KINDS[code], message, details);
  }
}

export function slotFull(slotId: string, capacity: number): VolunteerError {
  return new VolunteerError('SLOT_FULL', `The slot ${slotId} is full`, { slotId, capacity });
}
