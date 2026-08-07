/**
 * Ce qu'un test devient entre son lancer et sa collecte.
 *
 * Un test ne vit plus dans la mémoire de celui qui l'a lancé : son état voyage
 * sur le message de chat qui le porte, et tout le monde y lit la même chose
 * (voir ADR 0007). Ce module est cet état, et les transitions qui le font
 * bouger - corriger une fausse note, miser un trait, solder. Comme `score.ts`,
 * il ne connaît ni Foundry ni le DOM, et `test/state.mjs` le tient ligne à ligne
 * du livre.
 *
 * Ce que ce module ne sait pas : si un riff est ouvert (c'est la prime active
 * qui le dit), si un chasseur a encore des cartouches (c'est sa fiche), et
 * comment on écrit quoi que ce soit. Ceux-là combinent ce qu'ils savent avec ce
 * qu'on répond ici.
 */

import {
  Advantage,
  MAX_CARTONS,
  MouvementRules,
  Pool,
  Score,
  canCorrect as canCorrectNotes,
  dicePool,
  // L'extension est celle du JS émis, pas du TypeScript lu : c'est ce qui
  // permet au harnais de tests de charger ce module tel quel sous node, sans
  // empaqueteur. TypeScript et esbuild la réécrivent tous deux vers `.ts`.
} from "./score.js";
// `types.ts` ne contient que des types : l'import s'efface à l'émission, donc
// le harnais node ne voit jamais ce fichier passer.
import type { ActiveActivation, BespokeGrooveRules, Payment, SourcedActivation } from "../types";
import { applyResultEffects } from "./activationTerms.js";
import { correctionLimit, grooveScore } from "./bespokeGrooves.js";

/**
 * Les deux degrés d'usure d'un trait, plus l'état neuf.
 *
 * `dented` est ce qu'une correction coûte, et se répare. `broken` est ce qu'un
 * pari perdu coûte - « rayer d'une croix […] afin de signaler des dommages
 * sévères » - et ne se répare plus. Ni l'un ni l'autre ne donne de dé.
 */
export type TraitState = "usable" | "dented" | "broken";

/** Un trait mis sur la table, et ce qu'il est devenu depuis. */
export interface TestTrait {
  key: string;
  name: string;
  source: "hunter" | "mono";
  category: string;
  index: number;
  monoUuid: string;
  state: TraitState;
}

/** Le mouvement joué, seuil déjà corrigé, avec de quoi le réafficher. */
export interface TestMouvement extends MouvementRules {
  name: string;
  modifier: number;
}

export interface TestState {
  actorId: string;
  /** Le genre de la session, porté par la prime active. */
  genre: string;
  /** L'approche choisie par le chasseur. */
  category: string;
  mouvementIndex: number;
  mouvement: TestMouvement;
  advantage: Advantage;
  /**
   * Les dés ajoutés à la main dans la boîte de jet.
   *
   * Le livre n'en fait pas un barème : S'impliquer en donne deux, Improviser
   * ouvre une seconde approche, et Big Shot en accorde ou en retire au jugé. Ce
   * compteur porte tout ça d'un seul nombre, et il fait partie du groupement -
   * donc une relance de Quitte ou double le garde.
   */
  bonusDice: number;
  traits: TestTrait[];
  score: Score;
  /** Résultats immuables de la carte ; la dernière étape seule est courante. */
  history: TestStep[];
  corrected: number;
  /**
   * Le jet en cours est-il celui d'un Quitte ou double ?
   *
   * Un drapeau et pas un compteur : le dé que le riff ajoute vaut pour la
   * relance qu'on lance, il ne s'empile pas. Deux paris de suite donnent donc
   * le même groupement, et c'est le trait perdu à chaque fois qui le fait
   * descendre.
   */
  rerolled: boolean;
  /**
   * La relance du dé retiré a-t-elle déjà eu lieu ?
   *
   * Le désavantage n'écarte qu'un dé, donc Maître de la bidouille n'a qu'une
   * relance à offrir. Sans ce drapeau, chaque clic en ajoutait un de plus.
   */
  rerolledRemovedDie?: boolean;
  /**
   * Une face a-t-elle déjà été réécrite sur ce test ?
   *
   * « Transformer *un* résultat » : le geste vaut une fois, comme la relance du
   * dé écarté. Le prix seul ne le bornait pas - avec assez de fausses notes à
   * dépenser, tout un groupement finissait en 6.
   *
   * Quitte ou double ne le rend pas : il refait le jet, mais le groove reste
   * joué pour ce test.
   */
  rewroteDie?: boolean;
  settled: boolean;
  /**
   * Les riffs joués sur ce test, dans l'ordre, pour mémoire.
   *
   * Un fait acquis, et non un droit : la liste des riffs *ouverts* est relue en
   * direct sur la prime active à chaque rendu, donc elle peut se refermer sous
   * une carte encore en cours. Ce qui a été joué, lui, ne se reprend pas.
   */
  played?: PlayedRiff[];
  /**
   * Qui a assisté ce test, et ce qu'il doit.
   *
   * Enregistré et rappelé, jamais débité : on n'écrit que sur la fiche qu'on
   * joue (ADR 0009). L'assistant retire son rythme lui-même.
   */
  assist?: Assist;
  /**
   * Les grooves que ce test avait sur la table : celui du lanceur, et celui
   * qu'un Jam ! lui a prêté. Rappelés, jamais rejoués.
   */
  grooves?: TestGroove[];
  /** Les Activations en cours qui visaient ce test, gelées pour la carte. */
  running?: ActiveActivation[];
  /** Activations applicables gelées avec le Test (ADR 0012). */
  activations?: SourcedActivation[];
  /** Exceptions de la prime, figées avec le Test (ADR 0014). */
  grooveRules?: BespokeGrooveRules;
  /** Le lanceur pouvait-il réserver un résultat grâce à son groove ou à Jam ! ? */
  canReservePlan?: boolean;
}

export type TestStepKind = "roll" | "reroll" | "rewrite" | "rerollRemovedDie";

export interface TestStep {
  kind: TestStepKind;
  dice: number[];
  score: Score;
  /** Nom du riff ou du groove qui a produit une transformation. */
  source?: string;
  /** Rang du résultat planifié ; absent signifie que tous les dés ont été lancés. */
  plannedIndex?: number;
}

/** Un riff joué, tel que la carte le relit. */
export interface PlayedRiff {
  id: string;
  name: string;
  /** Celui des paiements acceptés que le joueur a choisi, s'il en coûtait un. */
  payment?: Payment;
  payments?: Payment[];
}

export interface Assist {
  actorId: string;
  name: string;
  /** Le riff qui l'a posée - Assister ou Jam ! - et ce qu'il coûte. */
  riffId: string;
  payment?: Payment;
  payments?: Payment[];
}

/**
 * Un groove mis sur la table par ce test, tel que la carte le relit.
 *
 * Gelé, comme les riffs joués : la liste des riffs *ouverts* se relit en direct
 * sur la prime et peut se refermer, mais un groove qui était là quand les dés
 * sont tombés y était. C'est vrai surtout du groove prêté par un Jam ! -
 * l'assistant peut en changer entre-temps, et la carte ne doit pas se mettre à
 * raconter un autre test que celui qui a eu lieu.
 */
export interface TestGroove {
  /**
   * L'identité de catalogue du groove, gelée avec la carte.
   *
   * Elle sert au rendu à ranger chaque bouton sous le badge du groove qui
   * l'ouvre : le nom ne suffit pas, une table peut renommer son exemplaire.
   * Absente sur les cartes posées avant que ce champ existe.
   */
  id?: string;
  name: string;
  description: string;
  /** Vide pour le groove du lanceur ; sinon, qui l'a prêté. */
  lentBy: string;
}

export interface OpenTest {
  actorId: string;
  genre: string;
  category: string;
  mouvementIndex: number;
  mouvement: TestMouvement;
  advantage: Advantage;
  /** Absent vaut zéro : un test sans riff n'ajoute rien. */
  bonusDice?: number;
  traits: Omit<TestTrait, "state">[];
  played?: PlayedRiff[];
  assist?: Assist;
  grooves?: TestGroove[];
  running?: ActiveActivation[];
  activations?: SourcedActivation[];
  grooveRules?: BespokeGrooveRules;
  canReservePlan?: boolean;
  /** Valeur consommée depuis la fiche pour ce lancer seulement. */
  plannedDie?: number;
}

/** Un test constitué, avant qu'aucun dé ne tombe. */
export function openTest(opened: OpenTest): TestState {
  return {
    ...opened,
    bonusDice: opened.bonusDice ?? 0,
    traits: opened.traits.map((trait) => ({ ...trait, state: "usable" })),
    score: { total: 0, cartons: 0, notes: 0 },
    history: [],
    corrected: 0,
    rerolled: false,
    settled: false,
    played: opened.played ?? [],
    grooves: opened.grooves ?? [],
    running: opened.running ?? [],
    activations: opened.activations ?? [],
  };
}

/** Les traits qui donnent encore un dé, et qu'on peut encore dépenser. */
export function usableTraits(state: TestState): TestTrait[] {
  return state.traits.filter((trait) => trait.state === "usable");
}

/**
 * Le groupement que ce test met sur la table en ce moment.
 *
 * Recalculé depuis les traits encore utilisables, jamais depuis ceux du
 * départ : un trait entamé pour corriger ne donne plus de dé, un trait brisé par
 * un pari non plus.
 */
function poolWith(state: TestState, extra: number): Pool {
  return dicePool({
    mouvement: state.mouvement,
    traits: usableTraits(state).length,
    genreBonus: state.genre === state.category,
    advantage: state.advantage,
    bonusDice: (state.bonusDice ?? 0) + extra,
  });
}

export function poolOf(state: TestState): Pool {
  return poolWith(state, state.rerolled ? 1 : 0);
}

/** Ce que le jet a produit. Les traits ne bougent pas : lancer ne coûte rien. */
export function applyDice(state: TestState, dice: number[], plannedDie?: number): TestState {
  const planned = Math.trunc(Number(plannedDie));
  const allDice = planned >= 1 && planned <= 6 ? [...dice, planned] : [...dice];
  const result = applyResultEffects(
    allDice,
    grooveScore(allDice, state.mouvement, state.category, state.genre, state.grooveRules),
    state.advantage,
    (state.activations ?? []).flatMap((activation) => activation.effects)
  );
  return {
    ...state,
    score: result,
    history: [...(state.history ?? []), {
      kind: "roll",
      dice: allDice,
      score: result,
      ...(allDice.length > dice.length ? { plannedIndex: allDice.length - 1 } : {}),
    }],
  };
}

function replaceCurrentScore(state: TestState, next: Score): TestStep[] {
  const history = [...(state.history ?? [])];
  if (history.length > 0) history[history.length - 1] = { ...history[history.length - 1], score: next };
  return history;
}

/**
 * Reste-t-il une fausse note à retirer, et le droit de le faire ?
 *
 * Un test soldé n'a plus rien à corriger : ses jetons sont partis chez leurs
 * propriétaires, et la carte ne montre plus qu'un compte rendu.
 */
export function canCorrect(state: TestState): boolean {
  if (state.settled) return false;

  return canCorrectNotes({ notes: state.score.notes, corrected: state.corrected });
}

/** La troisième correction de Marchandises dangereuses exige un MONO. */
function traitCorrectionOpen(state: TestState, trait: TestTrait): boolean {
  if (state.settled || state.score.notes <= 0) return false;
  if (state.corrected < 2) return true;
  return state.corrected < correctionLimit(state.grooveRules) && trait.source === "mono";
}

/** Partenaires valides après avoir entamé le premier trait. */
export function correctionPartners(state: TestState, key: string): TestTrait[] {
  const first = spendable(state, key);
  if (!first || !traitCorrectionOpen(state, first)) return [];
  const afterFirst = { ...state, traits: withTrait(state, key, "dented") };
  return usableTraits(afterFirst).filter((trait) => trait.key !== key && !blocked(afterFirst, trait));
}

/**
 * Le MONO encaisse avant son pilote.
 *
 * « Ces traits sont endommagés, et même sévèrement endommagés, avant tout autre
 * trait » : la phrase couvre les deux degrés, donc la priorité vaut aussi bien
 * pour une correction que pour une mise.
 */
function blocked(state: TestState, trait: TestTrait): boolean {
  if (trait.source === "mono") return false;

  return usableTraits(state).some((other) => other.source === "mono");
}

/** Les traits que la carte propose, MONO en tête, avec ce qui les barre. */
export function cardTraits(state: TestState) {
  return [...state.traits]
    .sort((a, b) => Number(b.source === "mono") - Number(a.source === "mono"))
    .map((trait) => {
      const priorityBlocked = blocked(state, trait);
      const partnerBlocked = state.grooveRules?.smallerBites === true && correctionPartners(state, trait.key).length === 0;
      return {
        ...trait,
        isMono: trait.source === "mono",
        blocked: priorityBlocked,
        canCorrect: !priorityBlocked && !partnerBlocked && traitCorrectionOpen(state, trait),
      };
    });
}

/** Un trait dépensable maintenant, ou rien du tout. */
function spendable(state: TestState, key: string): TestTrait | undefined {
  const trait = state.traits.find((candidate) => candidate.key === key);
  if (!trait || trait.state !== "usable") return undefined;
  if (blocked(state, trait)) return undefined;

  return trait;
}

/** Ceux que le chasseur peut mettre en jeu sur un Quitte ou double. */
export function stakeableTraits(state: TestState): TestTrait[] {
  if (state.settled) return [];

  return usableTraits(state).filter((trait) => !blocked(state, trait));
}

function withTrait(
  state: TestState,
  key: string,
  become: TraitState
): TestTrait[] {
  return state.traits.map((trait) =>
    trait.key === key ? { ...trait, state: become } : trait
  );
}

function corrected(state: TestState): TestState {
  const after = state.score.notes > 0 && state.corrected < correctionLimit(state.grooveRules)
    ? { notes: state.score.notes - 1, corrected: state.corrected + 1 }
    : { notes: state.score.notes, corrected: state.corrected };

  return {
    ...state,
    score: { ...state.score, notes: after.notes },
    history: replaceCurrentScore(state, { ...state.score, notes: after.notes }),
    corrected: after.corrected,
  };
}

/**
 * « Il peut retirer une fausse note en cochant une cartouche. »
 *
 * Le nom dit la cartouche parce que c'est ce que le livre de base fait payer,
 * mais la transition ne connaît aucune ressource : une session filler fait payer
 * la même correction en rythme, et c'est le même geste (ADR 0008). Ce qui a été
 * débité est décidé sur la carte, pas ici.
 */
export function correctByCartridge(state: TestState): TestState {
  if (!canCorrect(state)) return state;

  return corrected(state);
}

/**
 * Les cartons qu'un riff fabrique hors des dés.
 *
 * « S'il n'a pas obtenu le maximum de deux cartons, il peut déclencher deux
 * fausses notes afin de faire un carton » : la garde du livre n'a pas besoin
 * d'être écrite deux fois. Le plafond est celui de `score()`, et un effet qui
 * ne peut plus rien ajouter rend l'état inchangé - ce qui est exactement ce que
 * le bouton lit pour se griser.
 */
export function addCartons(state: TestState, amount: number): TestState {
  if (state.settled) return state;

  const cartons = Math.max(0, Math.min(MAX_CARTONS, state.score.cartons + amount));
  if (cartons === state.score.cartons) return state;

  const next = { ...state.score, cartons };
  return { ...state, score: next, history: replaceCurrentScore(state, next) };
}

/**
 * Les fausses notes qu'un riff ajoute : celles que Forcer déclenche, et celles
 * que Big Shot achète avec un risque.
 *
 * Ce sont des fausses notes comme les autres. Elles rejoignent la pile et
 * restent corrigibles, sous le même plafond de deux corrections par test - le
 * livre n'en distingue pas deux espèces, et en distinguer deux demanderait de
 * l'expliquer sur la carte.
 */
export function addNotes(state: TestState, amount: number): TestState {
  if (state.settled) return state;

  const notes = Math.max(0, state.score.notes + amount);
  if (notes === state.score.notes) return state;

  const next = { ...state.score, notes };
  return { ...state, score: next, history: replaceCurrentScore(state, next) };
}

/** Consigne un riff joué. L'ordre est celui du jeu, pas celui du livre. */
export function logRiff(state: TestState, riff: PlayedRiff): TestState {
  return { ...state, played: [...(state.played ?? []), riff] };
}

/**
 * « Il peut retirer une fausse note en endommageant un trait. »
 *
 * Un trait déjà entamé ou brisé ne corrige plus rien, et un trait de chasseur ne
 * corrige rien tant qu'il reste du MONO à dépenser.
 */
export function correctByTrait(state: TestState, key: string, secondKey?: string): TestState {
  const first = spendable(state, key);
  if (!first || !traitCorrectionOpen(state, first)) return state;

  let traits = withTrait(state, key, "dented");
  if (state.grooveRules?.smallerBites === true) {
    const partner = correctionPartners(state, key).find((trait) => trait.key === secondKey);
    if (!partner) return state;
    traits = withTrait({ ...state, traits }, partner.key, "dented");
  }

  return { ...corrected(state), traits };
}

/**
 * Le groupement d'un Quitte ou double : celui du test, plus un dé.
 *
 * Le trait mis en jeu n'est pas encore brisé quand on lance - le livre ne le
 * raye qu'au vu du résultat - donc il donne toujours le sien.
 *
 * Le dé ne s'empile pas sur celui d'une relance précédente : toute relance vaut
 * le groupement du moment plus un, et c'est le trait perdu à chaque pari qui
 * fait redescendre ce groupement.
 */
export function rerollPool(state: TestState): Pool {
  return poolWith(state, 1);
}

/**
 * Quitte ou double, résolu.
 *
 * « Il ignore alors complètement le premier jet et relance son groupement en y
 * ajoutant un dé. S'il ne fait pas les deux cartons […] il doit rayer d'une
 * croix le trait mis en jeu afin de signaler des dommages sévères. »
 *
 * Le second résultat remplace le premier, meilleur ou pire, et rouvre les deux
 * corrections : c'est un autre jet, avec ses propres fausses notes. Ce qui a
 * déjà été payé reste payé - un trait entamé pour corriger le premier jet ne
 * revient pas.
 */
export function resolveReroll(
  state: TestState,
  stakedKey: string,
  dice: number[]
): TestState {
  if (state.settled) return state;
  if (!spendable(state, stakedKey)) return state;

  const rolled = applyResultEffects(
    dice,
    grooveScore(dice, state.mouvement, state.category, state.genre, state.grooveRules),
    state.advantage,
    (state.activations ?? []).flatMap((activation) => activation.effects)
  );
  const lost = rolled.cartons < 2;

  return {
    ...state,
    traits: lost ? withTrait(state, stakedKey, "broken") : state.traits,
    score: rolled,
    history: [...(state.history ?? []), { kind: "reroll", dice: [...dice], score: rolled, source: "doubleOrNothing" }],
    corrected: 0,
    rerolled: true,
  };
}

/**
 * Transforme une face sans écraser le résultat précédent. Le contrôle de la
 * face proposée appartient à l'Activation qui appelle cette transition.
 */
export function rewriteDie(
  state: TestState,
  dieIndex: number,
  face: number,
  source?: string
): TestState {
  if (state.settled || state.rewroteDie) return state;
  const current = state.history?.[state.history.length - 1];
  if (!current || dieIndex < 0 || dieIndex >= current.dice.length) return state;
  const value = Math.trunc(Number(face));
  if (value < 1 || value > 6) return state;
  const dice = current.dice.map((die, index) => index === dieIndex ? value : die);
  const result = applyResultEffects(
    dice,
    grooveScore(dice, state.mouvement, state.category, state.genre, state.grooveRules),
    state.advantage,
    (state.activations ?? []).flatMap((activation) => activation.effects)
  );
  // `corrected` n'est pas remis à zéro : le plafond de deux corrections est
  // global au test. Seul Quitte ou double le rend, parce qu'il refait le jet en
  // entier ; réécrire une face ne refait pas le test.
  return {
    ...state,
    score: result,
    rewroteDie: true,
    history: [...state.history, { kind: "rewrite", dice, score: result, source, plannedIndex: current.plannedIndex }],
  };
}

/**
 * Ajoute le dé relancé au groupement courant et conserve les deux étapes.
 *
 * Une seule fois par test : il n'y a qu'un dé retiré par le désavantage, donc
 * qu'une relance possible. `rerolledRemovedDie` marque que c'est fait, sans quoi
 * chaque clic ajouterait un dé de plus.
 */
export function rerollRemovedDie(
  state: TestState,
  face: number,
  source?: string
): TestState {
  if (state.settled || state.rerolledRemovedDie) return state;
  const current = state.history?.[state.history.length - 1];
  const value = Math.trunc(Number(face));
  if (!current || value < 1 || value > 6) return state;
  const dice = [...current.dice, value];
  const result = applyResultEffects(
    dice,
    grooveScore(dice, state.mouvement, state.category, state.genre, state.grooveRules),
    state.advantage,
    (state.activations ?? []).flatMap((activation) => activation.effects)
  );
  return {
    ...state,
    score: result,
    rerolledRemovedDie: true,
    history: [...state.history, { kind: "rerollRemovedDie", dice, score: result, source, plannedIndex: current.plannedIndex }],
  };
}

/**
 * Le test est soldé : ses jetons sont partis chez leurs propriétaires.
 *
 * Les remettre à zéro plutôt que de les garder pour mémoire, parce que c'est
 * cette remise à zéro qui empêche une carte d'être collectée deux fois.
 */
export function settle(state: TestState): TestState {
  const next = { ...state.score, cartons: 0, notes: 0 };
  return {
    ...state,
    score: next,
    history: replaceCurrentScore(state, next),
    settled: true,
  };
}
