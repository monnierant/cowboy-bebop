import { isForbidden } from "./rolls/activationTerms";
import type { Effect } from "./types";

/**
 * L'Offset de difficulté, et les gestes qui le déplacent.
 *
 * « Après avoir effectué un test, le CP peut dépenser ses cartons pour avancer
 * un segment de cadran, ou réduire de 1 la difficulté du mouvement pour les
 * prochains tests de la session. » La seconde destination vit ici (ADR 0015) :
 * un entier signé unique porté par la prime, appliqué au mouvement courant quel
 * qu'il soit, et soldé avec la session.
 *
 * Ce module n'applique pas l'offset - c'est `withDifficulty` qui le cuit dans le
 * mouvement au moment du lancer, si bien que la Carte le fige avec le reste du
 * Test. Ici on ne fait que le lire et l'écrire.
 *
 * Il ne décide pas non plus des dépenses : les jetons d'un test se répartissent
 * dans la boîte de collecte (`rolls/collectPlan.ts`), qui rend l'écart voulu.
 * Ce module l'écrit, et rien de plus.
 */

/** Ce que la prime porte, ou zéro. */
export function difficultyOffsetOf(prime: any): number {
  const raw = Math.trunc(Number(prime?.system?.difficultyOffset));
  return Number.isFinite(raw) ? raw : 0;
}

async function shiftOffset(prime: any, by: number): Promise<void> {
  if (!prime) return;
  await prime.update({ "system.difficultyOffset": difficultyOffsetOf(prime) + by });
}

/** Ce que Passe-partout ajoute au seuil quand un chasseur accepte son marché. */
export async function raiseDifficultyOffset(prime: any, by: number): Promise<void> {
  await shiftOffset(prime, by);
}

/** Vrai quand une Activation gelée interdit de dépenser un carton contre le seuil. */
export function cartonAgainstDifficultyForbidden(effects: Effect[]): boolean {
  return isForbidden(effects, "cartonAgainstDifficulty");
}

/**
 * Le chasseur a-t-il un droit de réduction ouvert par son Solo ! ?
 *
 * Sous *Vue du dernier étage*, dépenser un carton contre le seuil est interdit
 * « sauf s'ils jouent un Solo ! ». Solo ! vivant hors de tout test, l'exception
 * ne peut pas désigner un test : elle crédite un droit unique, consommé au
 * premier usage et perdu au solde de session (ADR 0015).
 */
export function hasDifficultyRelief(actor: any): boolean {
  return actor?.system?.difficultyRelief === true;
}

/**
 * L'écart tel que la collecte vient de le décider.
 *
 * Une valeur et non un déplacement : la boîte de collecte montre l'écart
 * résultant - dépenses et rachat de *Passe-partout* compris, celui-ci le posant
 * simplement à zéro - et c'est cette valeur-là qu'on écrit, pour que ce qui a
 * été lu soit exactement ce qui est écrit.
 */
export async function setDifficultyOffset(prime: any, offset: number): Promise<void> {
  if (!prime) return;
  await prime.update({ "system.difficultyOffset": Math.trunc(offset) });
}

/**
 * Le droit du Solo ! est consommé : il a servi à lever une interdiction.
 *
 * Il ne se consomme que là - sans interdiction à lever, dépenser un carton ne
 * l'entame pas et il reste disponible pour le test où il servira vraiment.
 */
export async function consumeDifficultyRelief(actor: any): Promise<void> {
  if (!hasDifficultyRelief(actor)) return;
  await actor.update({ "system.difficultyRelief": false });
}
