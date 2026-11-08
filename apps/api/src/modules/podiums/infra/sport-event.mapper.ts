import { Podium } from '../domain/podium';
import { SportEvent } from '../domain/sport-event';
import type { EventRow } from './podiums.schema';

/** Ligne de la table → épreuve ; trois dossards nuls = résultat officiel inconnu. */
export function toDomain(row: EventRow): SportEvent {
  const { officialGoldBib: gold, officialSilverBib: silver, officialBronzeBib: bronze } = row;
  return SportEvent.restore({
    id: row.id,
    name: row.name,
    // La contrainte `events_official_result_check` garantit les trois ou aucun.
    officialResult:
      gold !== null && silver !== null && bronze !== null
        ? Podium.create({ gold, silver, bronze })
        : null,
  });
}
