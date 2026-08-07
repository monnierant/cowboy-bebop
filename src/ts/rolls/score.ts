/**
 * Ce que le livre appelle un test : le groupement de dés qu'on constitue, les
 * cartons et les fausses notes qu'on en lit, et les deux corrections qu'on a le
 * droit d'y apporter.
 *
 * Ce module ne connaît ni `Roll`, ni `game`, ni le DOM, et n'importe rien - pas
 * même `constants.ts`, qui lit `system.json`. C'est délibéré : le calcul d'un
 * score est la seule chose du système qu'une erreur rend injouable à la table
 * sans que personne s'en aperçoive, donc c'est la seule qu'on tienne par des
 * tests exhaustifs (`test/pure.mjs`). Tout ce qui touche à Foundry vit dans
 * `rolls/testState.ts` et `apps/rolls/testCard.ts`, qui appellent d'ici.
 */

/** « Le test produit jusqu'à deux cartons. » */
export const MAX_CARTONS = 2;

/** « Le CP peut alors retirer jusqu'à deux fausses notes. » */
export const MAX_CORRECTIONS = 2;

/** Avantage, rien, désavantage. Le livre n'en connaît pas d'autre. */
export type Advantage = -1 | 0 | 1;

/**
 * Le plancher d'un groupement.
 *
 * Un test sans dé n'est pas un test, et `0d6` n'est même pas une formule que
 * Foundry accepte. Rien dans le livre ne descend aussi bas ; c'est le compteur
 * libre de la boîte de jet, qui peut retirer des dés, qui rend ce plancher
 * nécessaire.
 */
export const MIN_DICE = 1;

/**
 * Ce qu'un mouvement apporte au calcul.
 *
 * La forme de `Mouvement` réduite à ce qui sert ici : `dices` est le rang du
 * mouvement, `notes` le nombre de fausses notes qu'un test qui n'en produit
 * aucune en fabrique.
 */
export interface MouvementRules {
  dices: number;
  difficulty: number;
  notes: number;
}

export interface PoolRequest {
  mouvement: MouvementRules;
  /** Combien de traits l'approche a mis dans la description de la fiction. */
  traits: number;
  /** L'approche choisie est-elle celle du genre de la session ? */
  genreBonus: boolean;
  /** Tel qu'il arrive du menu déroulant : chaîne, nombre, ou rien du tout. */
  advantage: unknown;
  /**
   * Les dés ajoutés hors traits, hors genre et hors avantage.
   *
   * Un nombre et pas un drapeau : Quitte ou double en ajoute un, S'impliquer
   * deux, et la boîte de jet en offre un compteur libre pour tout ce que le
   * livre laisse à la table. Il peut descendre sous zéro - Big Shot retire
   * parfois - et c'est pour ça que le groupement a un plancher.
   */
  bonusDice?: number;
}

export interface Pool {
  dice: number;
  advantage: Advantage;
  /** `dl`, `dh`, ou rien - le suffixe que Foundry attend après `Xd6`. */
  modifier: string;
  formula: string;
}

export interface Score {
  total: number;
  cartons: number;
  notes: number;
}

/** Les fausses notes d'un test, et combien en ont déjà été retirées. */
export interface Notes {
  notes: number;
  corrected: number;
}

/**
 * Ramène ce que le formulaire a rendu à l'un des trois états possibles.
 *
 * « Il n'est pas possible de bénéficier de plusieurs avantages ou de subir
 * plusieurs désavantages » : au-delà de un, on borne. Et un champ illisible vaut
 * zéro plutôt que NaN, qui se propagerait jusque dans le nombre de dés et
 * lancerait une formule que Foundry refuse.
 */
export function readAdvantage(value: unknown): Advantage {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) return 0;

  return Math.max(-1, Math.min(1, parsed)) as Advantage;
}

/**
 * Le groupement de dés d'un test.
 *
 * Le rang du mouvement, un dé par trait, un dé si l'approche est celle du genre
 * de la session, et un dé de plus si le test est avantagé ou désavantagé - celui
 * qu'on retirera aussitôt, par le plus faible ou par le plus élevé.
 */
export function dicePool(request: PoolRequest): Pool {
  const advantage = readAdvantage(request.advantage);
  const modifier = advantage === 1 ? "dl" : advantage === -1 ? "dh" : "";

  const dice = Math.max(
    MIN_DICE,
    request.mouvement.dices +
      request.traits +
      (request.genreBonus ? 1 : 0) +
      Math.abs(advantage) +
      (request.bonusDice ?? 0)
  );

  return { dice, advantage, modifier, formula: `${dice}d6${modifier}` };
}

/**
 * Le mouvement avec son seuil corrigé.
 *
 * « Modifier de 1 la difficulté du mouvement pour les prochains tests. Chaque
 * carton la réduit, chaque fausse note l'augmente. » L'écart voyage donc dans le
 * mouvement lui-même : tout ce qui suit lit `difficulty` sans avoir à connaître
 * l'existence de ce réglage. Un seuil négatif n'est pas un seuil, d'où le
 * plancher ; un écart illisible ne corrige rien.
 */
export function withDifficulty<T extends MouvementRules>(
  mouvement: T,
  modifier: unknown
): T & { modifier: number } {
  const parsed = Math.trunc(Number(modifier));
  const delta = Number.isFinite(parsed) ? parsed : 0;

  return {
    ...mouvement,
    difficulty: Math.max(0, mouvement.difficulty + delta),
    modifier: delta,
  };
}

/**
 * Les dés qui comptent, lus sur les termes d'un jet évalué.
 *
 * Celui qu'un avantage a retiré n'est plus du groupement : il ne compte ni dans
 * la somme, ni dans les 6, ni dans les 1. Foundry le laisse dans les résultats
 * en le marquant inactif, donc c'est ici qu'il sort.
 */
export function keptDice(terms: unknown): number[] {
  if (!Array.isArray(terms)) return [];

  return terms
    .flatMap((term: any) => (Array.isArray(term?.results) ? term.results : []))
    .filter((die: any) => die?.active)
    .map((die: any) => Number(die.result));
}

/**
 * Ce qu'un groupement lancé a produit.
 *
 * Un carton si la somme égale ou surpasse la difficulté, un autre si au moins
 * deux 6 sont sortis - deux au plus, quel que soit le nombre de 6. Une fausse
 * note par 1 ; et si le jet n'en a produit aucune, le mouvement en impose son
 * compte, deux au dernier. Ce plancher ne s'applique qu'à zéro : un seul 1 au
 * dernier mouvement reste une seule fausse note.
 */
export function score(dice: number[], mouvement: MouvementRules): Score {
  const total = dice.reduce((sum, die) => sum + die, 0);
  const sixes = dice.filter((die) => die === 6).length;
  const ones = dice.filter((die) => die === 1).length;

  const cartons = Math.min(
    MAX_CARTONS,
    (total >= mouvement.difficulty ? 1 : 0) + (sixes >= 2 ? 1 : 0)
  );

  return { total, cartons, notes: ones > 0 ? ones : mouvement.notes };
}

/** Reste-t-il une fausse note à retirer, et le droit de le faire ? */
export function canCorrect(state: Notes): boolean {
  return state.notes > 0 && state.corrected < MAX_CORRECTIONS;
}

/**
 * Retire une fausse note, si les deux corrections ne sont pas déjà faites.
 *
 * Ce qui reste après reste : « Big Shot récupère toute fausse note restante afin
 * de l'utiliser. »
 */
export function correct(state: Notes): Notes {
  if (!canCorrect(state)) return state;

  return { notes: state.notes - 1, corrected: state.corrected + 1 };
}
