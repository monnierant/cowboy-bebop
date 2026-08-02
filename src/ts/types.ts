export interface Trait {
  name: string;
  damaged: boolean;
}

export interface Traits {
  [category: string]: Trait[];
}

/**
 * A line the GM writes on the prime before play and turns over during it. The
 * revealed flag is what the sheet reads to decide whether anyone but the GM
 * gets to see the name at all.
 */
export interface SessionTrait {
  name: string;
  revealed: boolean;
}

export interface Mouvement {
  name: string;
  difficulty: number;
  dices: number;
  notes: number;
}

/** À qui un riff est offert. Big Shot paie les siens en risques. */
export type RiffAudience = "hunter" | "bigshot";

/**
 * Une action de gameplay que les règles mettent à disposition pendant un test.
 * Nom et rappel sont traduits, donc seuls l'identifiant et le public sont ici -
 * la disponibilité par mouvement appartient aux types de session.
 */
export interface Riff {
  id: string;
  audience: RiffAudience;
}

/** Un riff écrit pour un type de session, qu'aucun livre ne nomme. */
export interface CustomRiff {
  name: string;
  description: string;
  audience: RiffAudience;
}

/** Ce qu'un type de session ouvre à un mouvement donné. */
export interface RiffSelection {
  selected: string[];
  custom: CustomRiff[];
}

/** Un riff tel que l'aide le liste, qu'il vienne du livre ou de Big Shot. */
export interface RiffCard {
  name: string;
  description: string;
  audience: RiffAudience;
  custom: boolean;
}



/** What a settled roll credited, and to whom. Read back on the chat card. */
export interface Settlement {
  genre: string;
  cartons: number;
  notes: number;
  hunterName: string;
  /** Empty when the roll produced no false note, so no prime was involved. */
  primeName: string;
}

export interface Colors {
  [key: string]: {
    on: string;
    off: string;
    fa: string;
  };
}
