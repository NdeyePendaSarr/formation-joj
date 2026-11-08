import { hasDistinctBibs, PODIUM_BIB_MAX } from '@joj/shared';
import { PodiumError } from './podiums.errors';

export interface PodiumBibs {
  gold: number;
  silver: number;
  bronze: number;
}

/** Trois dossards dans l'ordre or, argent, bronze : celui d'un post ou le résultat officiel. */
export class Podium {
  private constructor(private readonly bibs: PodiumBibs) {}

  static create(bibs: PodiumBibs): Podium {
    for (const bib of [bibs.gold, bibs.silver, bibs.bronze]) {
      if (!Number.isInteger(bib) || bib < 1 || bib > PODIUM_BIB_MAX) {
        throw new PodiumError('PODIUM_BIB_INVALID', `Invalid bib ${bib}`, { bib });
      }
    }
    if (!hasDistinctBibs(bibs)) {
      throw new PodiumError('PODIUM_BIBS_NOT_DISTINCT', 'A bib cannot hold two places', {
        ...bibs,
      });
    }
    return new Podium({ ...bibs });
  }

  get gold(): number {
    return this.bibs.gold;
  }

  get silver(): number {
    return this.bibs.silver;
  }

  get bronze(): number {
    return this.bibs.bronze;
  }

  /** Mêmes athlètes aux trois places, dans le même ordre. */
  equals(other: Podium): boolean {
    return this.gold === other.gold && this.silver === other.silver && this.bronze === other.bronze;
  }
}
