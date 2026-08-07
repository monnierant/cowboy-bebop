/**
 * Une phrase qui ajoute un dé tant qu'elle n'est ni entamée ni brisée.
 *
 * Les deux degrés vivent ici et pas ailleurs : celles d'un chasseur sont
 * rangées sous un genre, celles d'un MONO servent dans tous les genres, mais
 * elles s'usent exactement de la même façon.
 */
export interface Trait {
  name: string;
  dented: boolean;
  broken: boolean;
}

export interface Traits {
  [category: string]: Trait[];
}

/** D'où vient un dé offert par un trait. */
export type TraitSource = "hunter" | "mono";

/**
 * Un trait tel qu'il est proposé au jet, puis relu sur la carte de chat.
 *
 * Le nom ne suffit pas à désigner un trait : depuis que ceux d'un MONO
 * cohabitent avec ceux du chasseur dans la même réserve, deux homonymes
 * seraient indiscernables, et la priorité de dégât a justement besoin de savoir
 * lequel vient du vaisseau. C'est `key` qui identifie, le nom ne fait
 * qu'afficher.
 */
export interface PoolTrait {
  /** `hunter:<genre>:<index>` ou `mono:<index>`. */
  key: string;
  name: string;
  source: TraitSource;
  /** Le genre, pour un trait de chasseur ; vide pour un trait de MONO. */
  category: string;
  /** Son rang chez son porteur. Sur un MONO, 0 désigne le nom. */
  index: number;
  /** L'uuid du MONO qui le porte, vide pour un trait de chasseur. */
  monoUuid: string;
  /** Endommagé mais proposé par Détermination inébranlable. */
  dented?: boolean;
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
 * Ce avec quoi un riff se paie.
 *
 * Six et pas plus (ADR 0008) : le vocabulaire est fermé, et il couvre tous les
 * prix du livre, y compris ceux qui ne sont pas des compteurs. Un trait misé
 * n'est pas un trait entamé - l'un se raye au vu d'un résultat, l'autre encaisse
 * tout de suite - et une fausse note déclenchée est bien un prix : c'est ce que
 * Forcer débourse.
 */
export type PaymentResource =
  | "cartridge"
  | "rythme"
  | "risque"
  | "dentTrait"
  | "stakeTrait"
  | "note";

export interface Payment {
  resource: PaymentResource;
  amount: number;
}

/**
 * Les exceptions nommées du lot ADR 0014, figées avec un Test.
 *
 * Elles ne deviennent pas des Effets configurables : chacune dépend d'un état
 * de fiche ou d'un geste propre que le vocabulaire fermé des Activations ne
 * prétend pas décrire.
 */
export interface BespokeGrooveRules {
  orbitalSafe?: boolean;
  dangerousGoods?: boolean;
  smallerBites?: boolean;
  vengeanceHunterId?: string;
  shadowsHunterIds?: string[];
  shadowsAccepted?: boolean;
}

/**
 * Ce qu'un riff fait.
 *
 * Aucune de ces primitives n'a été inventée pour l'éditeur : chacune est due à
 * un riff du livre, donc écrite de toute façon. Les exposer coûte l'éditeur,
 * pas le moteur.
 */
export type QuantifiedEffectKind =
  | "dice"
  | "advantage"
  | "difficulty"
  | "cartons"
  | "notes"
  | "heal"
  | "approach"
  | "minimumNotes"
  | "notesPerMissingCarton";

export interface QuantifiedEffect {
  kind: QuantifiedEffectKind;
  amount: number;
}

export type Prohibition =
  | "disadvantage"
  | "damageRemoval"
  | "cartonAgainstDifficulty";

export type ResultTransformation =
  | "rerollPool"
  | "rerollRemovedDie"
  | "rewriteDie";

/**
 * Un effet ne porte un montant que si sa nature en a besoin (ADR 0012).
 * Les variantes booléennes ne traînent donc plus le `amount: 1` artificiel que
 * les anciennes règles de calcul écrivaient dans le compendium.
 */
export type Effect =
  | QuantifiedEffect
  | { kind: "disadvantageDoubleCarton" }
  | { kind: "dentedTraitsOnDisadvantage" }
  | { kind: "forbid"; target: Prohibition }
  | { kind: "transformResult"; operation: ResultTransformation };

export type EffectKind = Effect["kind"];

export type ConditionKind =
  | "underDisadvantage"
  | "sessionGenre"
  | "offSessionGenre";

export interface ActivationCondition {
  kind: ConditionKind;
}

/**
 * La mécanique atomique commune aux riffs et aux grooves (ADR 0012).
 * Les conditions sont conjointes et les paiements sont des alternatives dont
 * chaque option est appliquée en entier.
 */
export interface Activation {
  conditions: ActivationCondition[];
  paymentOptions: Payment[][];
  effects: Effect[];
  /** Absente sur une activation instantanée. */
  scope?: ActivationScope;
  untilSecret?: boolean;
  /** Une activation secrète n'est détaillée que pour Big Shot. */
  secret?: boolean;
}

/**
 * Quand un riff se joue.
 *
 * Se déduit de ses effets et ne se règle pas : les dés, l'avantage et le seuil
 * s'appliquent au lancer, les jetons sur la carte. Seul `sheet` doit être dit,
 * parce qu'il ne se déduit de rien - c'est Solo !, qui se joue hors de tout
 * test.
 */
export type RiffPhase = "roll" | "card" | "sheet";

/**
 * Une action de gameplay que les règles mettent à disposition pendant un test.
 * Nom et rappel sont traduits, donc ne restent ici que l'identifiant, le public
 * et ce que le livre demande - la disponibilité par mouvement, et le prix
 * réellement pratiqué, appartiennent aux types de session.
 */
export interface Riff {
  id: string;
  audience: RiffAudience;
  /** Ce que le livre pratique, et ce qu'on pré-remplit quand on coche. */
  activation?: Activation;
  /**
   * Vrai quand le prix n'est pas payé par celui qui joue le test.
   *
   * Le système enregistre alors la dette et la rappelle, sans jamais la
   * débiter : on n'écrit que sur la fiche qu'on joue (ADR 0009).
   */
  owed?: boolean;
  /**
   * Vrai quand les six primitives ne décrivent pas ce riff.
   *
   * Deux le sont : Quitte ou double, qui relance puis raye selon le résultat,
   * et Solo !, qui vit hors de tout test. Ils restent nommés et ne sont donc
   * pas reproductibles par un riff libre - c'est dit au glossaire plutôt que
   * caché.
   */
  bespoke?: boolean;
  /** Seulement quand les effets ne suffisent pas à la déduire. */
  phase?: RiffPhase;
}

/**
 * À qui un groove appartient.
 *
 * Les mêmes deux camps que `RiffAudience`, mais nommés d'après les types
 * d'acteur : un groove se dépose sur une fiche, et c'est cette fiche qui décide
 * s'il a un sens. *Menace planétaire* posé sur Spike n'en a aucun.
 */
export type GrooveAudience = "chasseur" | "prime";

/**
 * L'horloge d'une Activation persistante.
 *
 * Trois valeurs, et chacune correspond à un événement qui existe déjà : une
 * carte pour un test, `system.mouvement` pour le mouvement, `resetSession()`
 * pour la session. La révélation du secret est une quatrième horloge, mais elle
 * ne remplace pas celle-ci — voir `Activation.untilSecret`.
 */
export type ActivationScope = "test" | "mouvement" | "session";

/**
 * Les traits d'une approche mis à disposition d'une ou deux autres.
 *
 * Cinq grooves du livre n'ont pas d'autre effet, et disent tous la même phrase :
 * « utiliser systématiquement les traits de X pour les tests de Y ou Z ». Ne
 * donne jamais le dé de genre : ce sont les traits qui changent d'approche, pas
 * le test.
 */
export interface Substitution {
  /** L'approche dont les traits se prêtent. Vide vaut « aucune substitution ». */
  from: string;
  /** Les approches auxquelles ils se prêtent. */
  to: string[];
}

/**
 * Une Activation en cours : persistante, posée sur la prime, gelée avec le
 * Groove qui l'a produite.
 *
 * Ce qui la distingue d'une Activation instantanée n'est pas ce qu'elle fait -
 * c'est le même vocabulaire fermé - mais le fait qu'elle *reste*. C'est cette
 * durée qui fait tomber le mur du temps de l'ADR 0009 : posée avant le jet et
 * portée par la prime, elle est déjà là quand le joueur ouvre sa boîte.
 */
export interface ActiveActivation extends Activation {
  grooveId: string;
  name: string;
  description: string;
}

/**
 * Ce qu'un item groove porte (ADR 0013).
 *
 * Trois choses et seulement trois. Les Activations sont ce que le système
 * applique ; la Substitution ouvre des traits et reste dehors parce qu'elle est
 * le seul réglage qui nomme un genre ; les Rappels sont ce que le système dit
 * sans jamais l'appliquer.
 */
export interface Groove {
  audience: GrooveAudience;
  description: string;
  /** Absente quand le groove n'ouvre aucune approche. */
  substitution?: Substitution;
  activations: Activation[];
  reminders: GrooveReminder[];
}

export type ReminderAudience = "bigshot" | "table";

export interface GrooveReminder {
  text: string;
  audience: ReminderAudience;
}

/** Un riff écrit pour un type de session, qu'aucun livre ne nomme. */
export interface CustomRiff {
  name: string;
  description: string;
  audience: RiffAudience;
  /** Absente chez un riff libre à peine ajouté : il ne coûte rien et ne fait rien. */
  activation?: Activation;
  activationValid?: boolean;
}

/** Ce qu'un type de session ouvre à un mouvement donné, et à quel prix. */
export interface RiffSelection {
  selected: string[];
  custom: CustomRiff[];
  /**
   * Ce que Big Shot a retouché, par identifiant de riff du livre.
   *
   * Additif, et c'est ce qui remplace une migration : une entrée absente vaut
   * le prix du livre, donc un type de session qui n'a rien retouché ne stocke
   * rien du tout.
   */
  activations?: Record<string, Activation>;
  /**
   * Le prix d'une correction, qui n'est pas un riff mais une règle de base.
   *
   * C'est pourtant la première chose qu'une session filler change, et aucun des
   * huit riffs ne peut la porter. Absent vaut le prix du livre : une cartouche
   * ou un trait entamé.
   */
  correction?: Payment[];
}

/** Un riff tel que l'aide le liste, qu'il vienne du livre ou de Big Shot. */
export interface RiffCard {
  id: string;
  name: string;
  description: string;
  audience: RiffAudience;
  custom: boolean;
  /** Les alternatives de prix : le joueur en choisit une, qui s'applique entière. */
  paymentOptions: Payment[][];
  effects: Effect[];
  phase: RiffPhase;
  owed: boolean;
  bespoke: boolean;
  activation: Activation;
  activationValid?: boolean;
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
