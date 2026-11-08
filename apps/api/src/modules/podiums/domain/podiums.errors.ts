import { AppError, type ErrorKind } from '../../../core/errors/app-error';

/** Codes stables exposés aux clients ; la catégorie décide du statut HTTP. */
const PODIUM_ERROR_KINDS = {
  /** Aucune épreuve n'a cet identifiant. */
  EVENT_NOT_FOUND: 'NOT_FOUND',
  /** L'épreuve existe, mais son résultat officiel n'est pas connu. */
  OFFICIAL_RESULT_UNKNOWN: 'CONFLICT',
  /** Le podium n'a pas les mêmes dossards que le résultat officiel, dans l'ordre. */
  PODIUM_CONTRADICTS_OFFICIAL: 'CONFLICT',
  /** Nom vide, ou fait seulement d'espaces. */
  JOURNALIST_NAME_REQUIRED: 'VALIDATION',
  JOURNALIST_NAME_TOO_LONG: 'VALIDATION',
  /** Nom contenant U+0000, que Postgres refuse dans un texte. */
  JOURNALIST_NAME_INVALID: 'VALIDATION',
  /** Dossard qui n'est pas un entier de 1 à PODIUM_BIB_MAX. */
  PODIUM_BIB_INVALID: 'VALIDATION',
  /** Un même dossard occupe deux places. */
  PODIUM_BIBS_NOT_DISTINCT: 'VALIDATION',
} as const satisfies Record<string, ErrorKind>;

export type PodiumErrorCode = keyof typeof PODIUM_ERROR_KINDS;

export class PodiumError extends AppError<PodiumErrorCode> {
  constructor(code: PodiumErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, PODIUM_ERROR_KINDS[code], message, details);
  }
}

export function eventNotFound(id: string): PodiumError {
  return new PodiumError('EVENT_NOT_FOUND', `No event with id ${id}`, { id });
}

export function officialResultUnknown(eventId: string): PodiumError {
  return new PodiumError('OFFICIAL_RESULT_UNKNOWN', `The event ${eventId} has no official result`, {
    eventId,
  });
}

export function podiumContradictsOfficial(eventId: string): PodiumError {
  return new PodiumError(
    'PODIUM_CONTRADICTS_OFFICIAL',
    `The podium contradicts the official result of the event ${eventId}`,
    { eventId },
  );
}
