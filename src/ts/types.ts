export interface Trait {
  name: string;
  damaged: boolean;
}

export interface Traits {
  [category: string]: Trait[];
}

export interface Mouvement {
  name: string;
  difficulty: number;
  dices: number;
  notes: number;
}



export interface Colors {
  [key: string]: {
    on: string;
    off: string;
    fa: string;
  };
}
