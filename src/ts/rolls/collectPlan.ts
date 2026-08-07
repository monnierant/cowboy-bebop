/**
 * Ce que la collecte va écrire, tant que personne n'a validé.
 *
 * Les deux destinations d'un jeton - le cadran d'un chasseur, ou le seuil du
 * mouvement (ADR 0015) - se décident au même moment : quand le test est fini et
 * qu'on regarde ce qu'il a donné. La boîte de collecte est donc le seul endroit
 * où l'on choisit, et ce module en est la partie qui ne connaît ni Foundry ni le
 * DOM : une offre, un plan, et les gestes qui déplacent l'un vers l'autre.
 *
 * Rien ici n'écrit. C'est ce qui permet de cliquer, de se tromper, de fermer la
 * boîte sans rien laisser derrière - et de tenir la règle en tests purs, comme
 * `testState.ts`.
 *
 * C'est aussi la réponse au piège du score : un jeton retiré du résultat entre
 * deux relances réapparaissait au premier Quitte ou double, puisque le score est
 * recalculé depuis les dés à chaque étape. Ne rien dépenser avant la collecte
 * supprime la question.
 */

/** Ce que le test met sur la table au moment de collecter. */
export interface CollectOffer {
  cartons: number;
  notes: number;
  /** Le genre de la session : celui sous lequel les jetons se rangent. */
  genre: string;
  /** L'écart de difficulté porté par la prime avant que la boîte n'ouvre. */
  offset: number;
  /** Un Groove de la prime interdit-il le carton contre le seuil ? */
  forbidden: boolean;
  /** Le chasseur a-t-il un droit de réduction ouvert par son Solo ! ? */
  relief: boolean;
  /**
   * *Passe-partout* était-il sur la table quand les dés sont tombés ?
   *
   * Le rachat à deux cartons n'est pas une règle générale : c'est le mécanisme
   * spécial de ce Groove-là, qui annule sa propre hausse de +3 (ADR 0014). Hors
   * de lui, l'écart accumulé ne se rachète pas - il se solde avec la session.
   * Gelé avec le Test, comme les autres exceptions nommées : la prime peut avoir
   * changé de Groove entre le lancer et la collecte.
   */
  masterKey: boolean;
}

/** L'état de la répartition en cours. */
export interface CollectPlan {
  /** Ce qui ira au chasseur. */
  cartons: number;
  /** Ce qui ira à la prime. */
  notes: number;
  /** L'écart de difficulté tel qu'il sera écrit. */
  offset: number;
  /** Le rachat de Passe-partout a-t-il été joué ? */
  boughtBack: boolean;
  /** Le droit du Solo ! a-t-il servi à lever une interdiction ? */
  reliefUsed: boolean;
}

/** Les gestes qui réduisent la collecte, un bouton chacun dans la boîte. */
export type CollectGesture = "spend-carton" | "spend-note" | "buy-back";

/**
 * Les gestes que cette collecte-ci propose.
 *
 * Les deux dépenses contre le seuil sont une règle générale de l'économie : leur
 * bouton est toujours là, grisé avec son motif quand il ne peut pas être joué.
 * Le rachat, lui, appartient à *Passe-partout* : sans ce Groove, il n'existe pas,
 * et l'afficher grisé ferait croire à une règle que la table n'a pas.
 */
export function offeredGestures(offer: CollectOffer): CollectGesture[] {
  const offered: CollectGesture[] = ["spend-carton", "spend-note"];
  if (offer.masterKey) offered.push("buy-back");
  return offered;
}

/** Le plan de départ : tout est collecté, rien n'est dépensé. */
export function openPlan(offer: CollectOffer): CollectPlan {
  return {
    cartons: offer.cartons,
    notes: offer.notes,
    offset: offer.offset,
    boughtBack: false,
    reliefUsed: false,
  };
}

/**
 * Pourquoi ce geste ne se propose pas, ou rien s'il se propose.
 *
 * Une clé de traduction et pas un booléen, pour la même raison qu'ailleurs sur
 * la Carte : un bouton grisé sans motif se lit comme une panne.
 */
export function gestureBlocked(
  plan: CollectPlan,
  offer: CollectOffer,
  gesture: CollectGesture
): string | undefined {
  switch (gesture) {
    case "spend-carton":
      // L'interdiction de *Vue du dernier étage* ne tombe que si le chasseur a
      // ouvert un droit avec son Solo !, et ce droit ne sert qu'une fois.
      if (offer.forbidden && !(offer.relief && !plan.reliefUsed)) {
        return "COWBOY.difficulty.forbidden";
      }
      return plan.cartons > 0 ? undefined : "COWBOY.difficulty.noCarton";
    case "spend-note":
      return plan.notes > 0 ? undefined : "COWBOY.difficulty.noNote";
    case "buy-back":
      // Le rachat est le mécanisme spécial de *Passe-partout*, pas une règle
      // générale : hors de ce Groove, il ne se joue pas - la boîte ne le
      // propose même pas, et cette garde le tient si on l'appelle quand même.
      if (!offer.masterKey) return "COWBOY.difficulty.noMasterKey";
      // Racheter un écart nul ne rachète rien.
      if (plan.offset === 0) return "COWBOY.difficulty.noOffset";
      return plan.cartons >= 2 ? undefined : "COWBOY.difficulty.needTwoCartons";
  }
}

/**
 * Le plan après ce geste, ou le plan inchangé s'il était barré.
 *
 * L'écart est porté en valeur, pas en delta : le rachat le pose à zéro, et ce
 * qu'on dépense ensuite compte à partir de là. C'est aussi cette valeur que la
 * boîte affiche, donc ce qu'on lit est exactement ce qui sera écrit.
 */
export function play(
  plan: CollectPlan,
  offer: CollectOffer,
  gesture: CollectGesture
): CollectPlan {
  if (gestureBlocked(plan, offer, gesture)) return plan;

  switch (gesture) {
    case "spend-carton":
      return {
        ...plan,
        cartons: plan.cartons - 1,
        offset: plan.offset - 1,
        // Le droit du Solo ! ne se consomme que lorsqu'il a réellement servi à
        // lever une interdiction : sans interdiction, il reste disponible.
        reliefUsed: plan.reliefUsed || offer.forbidden,
      };
    case "spend-note":
      return { ...plan, notes: plan.notes - 1, offset: plan.offset + 1 };
    case "buy-back":
      // « Les CP peuvent annuler l'augmentation » : l'écart entier, y compris la
      // part que les chasseurs avaient eux-mêmes achetée.
      return { ...plan, cartons: plan.cartons - 2, offset: 0, boughtBack: true };
  }
}

/** Vrai quand la boîte n'a rien changé à ce que le test rendait. */
export function untouched(plan: CollectPlan, offer: CollectOffer): boolean {
  return (
    plan.cartons === offer.cartons &&
    plan.notes === offer.notes &&
    plan.offset === offer.offset
  );
}
