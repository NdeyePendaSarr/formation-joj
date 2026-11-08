import type { Podium } from './podium';
import { officialResultUnknown, podiumContradictsOfficial } from './podiums.errors';

export interface SportEventProps {
  id: string;
  name: string;
  /** `null` tant que le résultat officiel n'est pas connu. */
  officialResult: Podium | null;
}

/** Une épreuve des JOJ, avec son résultat officiel venu des données de départ. */
export class SportEvent {
  private constructor(private readonly props: SportEventProps) {}

  /** Les épreuves viennent seulement des données de départ : pas de `create()` dans cette tranche. */
  static restore(props: SportEventProps): SportEvent {
    return new SportEvent({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get officialResult(): Podium | null {
    return this.props.officialResult;
  }

  /** Lève une erreur si le podium ne peut pas être certifié par le résultat officiel. */
  certify(podium: Podium): void {
    if (this.props.officialResult === null) {
      throw officialResultUnknown(this.id);
    }
    if (!podium.equals(this.props.officialResult)) {
      throw podiumContradictsOfficial(this.id);
    }
  }
}
