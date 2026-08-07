import { moduleId } from "../../constants";
import { getActivePrime } from "../../prime";
import { correctionPayments, riffSelection, riffsForPhase } from "../../riffs";
import { confirmPlayOption, payOption, paymentLabel, paymentOptionBlocked, paymentOptionLabel, playable } from "../../riffPlay";
import { hunterPaymentOptions } from "../../rolls/bespokeGrooves";
import { cardEffects, isCounter } from "../../rolls/activationTerms";
import { keptDice } from "../../rolls/score";
import { Payment, RiffAudience } from "../../types";
import {
  OpenTest,
  TestState,
  addCartons,
  addNotes,
  applyDice,
  canCorrect,
  cardTraits,
  correctByCartridge,
  correctByTrait,
  correctionPartners,
  logRiff,
  openTest,
  poolOf,
  rerollPool,
  resolveReroll,
  rerollRemovedDie,
  rewriteDie,
  settle,
  stakeableTraits,
} from "../../rolls/testState";

/**
 * La Carte : là où un test vit entre son lancer et sa collecte.
 *
 * Tout l'état du test tient dans un flag sur le message de chat, et pas dans la
 * mémoire de celui qui a lancé (ADR 0007). C'est ce qui permet à Big Shot comme
 * au chasseur d'agir sur la même carte, et à la carte de survivre à un
 * rechargement de page.
 *
 * Ce module ne calcule rien : il lit le flag, appelle une transition de
 * `rolls/testState.ts`, et réécrit. La carte est toujours modifiée **sur
 * place** - jamais effacée et republiée : republier changerait l'auteur du
 * message, donc son propriétaire, et Big Shot corrigeant la carte d'un joueur
 * lui volerait sa propre carte.
 */

export const testFlag = "test";

/** Le riff qui met un trait en jeu pour relancer le groupement. */
const stakeRiff = "doubleOrNothing";

/** L'état du test port par cette carte, ou rien si ce n'en est pas une. */
export function testOf(message: any): TestState | undefined {
  return message?.flags?.[moduleId]?.[testFlag];
}

/**
 * Qui peut agir sur cette carte : son auteur, et tout MJ.
 *
 * C'est exactement la permission `OWNER` que Foundry applique déjà au message -
 * `getUserLevel` ne donne `OWNER` qu'à l'auteur, les MJ passant par leur rôle.
 * Aligner le droit de cliquer sur le droit d'écrire est ce qui évite tout
 * relais : quiconque voit un bouton actif peut mener son geste jusqu'au bout.
 */
export function mayAct(message: any): boolean {
  return message?.isAuthor === true || (game as any).user?.isGM === true;
}

/**
 * À qui la carte revient.
 *
 * Quand Big Shot lance pour un chasseur, la carte est écrite au nom du joueur
 * dont c'est le personnage : sans quoi ce joueur ne pourrait rien corriger sur
 * son propre test. Foundry l'autorise aux MJ seuls (`#canCreate` s'ouvre sur
 * `user.isGM`), donc un joueur signe toujours de son propre nom.
 */
function cardAuthor(actor: any): string {
  const me = (game as any).user;
  if (!me?.isGM) return me?.id;

  const users = ((game as any).users ?? []).filter((user: any) => !user.isGM);

  const assigned = users.find((user: any) => user.character?.id === actor?.id);
  if (assigned) return assigned.id;

  const owners = users.filter((user: any) =>
    actor?.testUserPermission?.(user, "OWNER")
  );
  if (owners.length === 1) return owners[0].id;

  return me.id;
}

/**
 * Le riff est-il sur la table à ce mouvement ?
 *
 * La liste des riffs ouverts appartient à la prime active, qui *est* la session
 * en cours (ADR 0003). Une carte n'offre donc un pari que si la session le
 * permet - et une prime sans type de session appliqué n'ouvre rien.
 */
function stakeOpen(state: TestState): boolean {
  return riffSelection(getActivePrime(), state.mouvementIndex).selected.includes(
    stakeRiff
  );
}

/**
 * Les riffs que ce test peut encore encaisser, et ce qui les barre.
 *
 * Relus en direct sur la prime active, comme le pari : la table peut donc voir
 * un bouton se fermer si Big Shot avance le mouvement en cours de résolution.
 * C'est assumé - ce qui a déjà été *joué* reste consigné dans l'état.
 *
 * Quitte ou double est retiré d'ici : il est câblé à part, avec un bouton par
 * trait puisque c'est un trait qu'il met en jeu, et non une ressource.
 */
function cardRiffs(state: TestState, audience: RiffAudience, actor: any) {
  const prime = getActivePrime();
  if (!prime) return [];

  const open = riffsForPhase(prime, state.mouvementIndex, audience, "card")
    .filter((riff) => riff.id !== stakeRiff);

  return playable(open, actor, {}, state.grooveRules).map((riff) => {
    const blocked = cardBlocked(state, riff.effects);

    return {
      ...riff,
      choices: riff.choices.map((choice) => ({
        ...choice,
        // Un prix pris sur un trait n'a pas de bouton générique : il faut
        // désigner *quel* trait, ce que seul Quitte ou double sait faire.
        blocked:
          choice.blocked ??
          blocked ??
          (choice.amount > 0 && !isCounter(choice.resource) && choice.resource !== "note"
            ? localize("COWBOY.riffs.notCounted")
            : undefined),
      })),
    };
  });
}

/**
 * Pourquoi ces effets ne changeraient rien à ce test, ou rien s'ils le changent.
 *
 * C'est ici que la garde de Forcer - « s'il n'a pas obtenu le maximum de deux
 * cartons » - se trouve appliquée sans avoir été écrite : `addCartons` rend
 * l'état inchangé quand le plafond est atteint, et le bouton le lit.
 */
function cardBlocked(state: TestState, effects: any[]): string | undefined {
  if (state.settled) return localize("COWBOY.roll.actions.collected");

  const { cartons, notes } = cardEffects(effects);
  if (cartons === 0 && notes === 0) return undefined;

  const after = addNotes(addCartons(state, cartons), notes);
  return after === state ? localize("COWBOY.riffs.noEffect") : undefined;
}

/**
 * Ce qu'une correction coûte ici, et ce qu'on peut en payer.
 *
 * Deux paiements dont on choisit un, comme le code les traitait déjà séparément
 * - une cartouche, un trait entamé - à ceci près qu'une session filler les
 * déplace vers le rythme (ADR 0008). Les traits gardent leurs propres boutons :
 * il faut désigner lequel encaisse.
 */
function correctionChoices(state: TestState, actor: any) {
  const payments = correctionPayments(getActivePrime(), state.mouvementIndex);

  return {
    // Ceux qui se prennent sur une réserve : un bouton chacun, grisé avec son
    // motif quand elle est vide.
    counters: hunterPaymentOptions(
      payments.filter((payment) => isCounter(payment.resource)).map((payment) => [payment]),
      String(actor?.id ?? ""),
      state.grooveRules
    ).map((option, index) => ({
      index,
      payments: option,
      label: paymentOptionLabel(option),
      blocked: paymentOptionBlocked(option, actor),
    })),
    // Celui qui se prend sur un trait ne peut pas avoir un bouton à lui : le
    // trait se choisit dans la liste, où chaque ligne porte déjà le sien.
    byTrait: payments.some((payment) => payment.resource === "dentTrait"),
  };
}

const localize = (key: string): string =>
  (game as any)?.i18n?.localize(key) ?? key;

/**
 * La carte, telle qu'elle se lit.
 *
 * Le jet voyage à part de l'état parce que Foundry le garde déjà sur le message,
 * dans `rolls` : les faces et le dé qu'un avantage a retiré vivent là, et les
 * recopier dans le flag serait tenir deux fois la même vérité. En revanche le
 * total affiché vient de l'état, pas du jet - c'est celui sur lequel les cartons
 * ont été comptés.
 */
async function renderCard(state: TestState, roll: any): Promise<string> {
  const actor = (game as any).actors?.get(state.actorId);
  const currentDice = state.history?.[state.history.length - 1]?.dice ?? [];
  const currentStep = state.history?.[state.history.length - 1];
  const transformations = (state.activations ?? []).flatMap((activation) =>
    activation.effects.filter((effect) => effect.kind === "transformResult")
  );

  return renderTemplate(`systems/${moduleId}/templates/chat/roll.hbs`, {
    history: (state.history ?? []).slice(0, -1).map((step, index) => ({
      ...step,
      index: index + 1,
      diceLabel: step.dice.join(" + "),
    })),
    result: roll,
    rewriteDice: transformations.some((effect: any) => effect.operation === "rewriteDie")
      ? currentDice.map((face, index) => ({ face, index })).filter((die) => die.face >= 2 && die.face <= 5)
      : [],
    plannedResult: currentStep?.plannedIndex !== undefined
      ? currentDice[currentStep.plannedIndex]
      : 0,
    reserveDice: state.canReservePlan && !state.settled
      ? currentDice
          .map((face, index) => ({ face, index }))
          .filter((die) => die.index !== currentStep?.plannedIndex)
      : [],
    canRerollRemovedDie: state.advantage < 0 && transformations.some((effect: any) => effect.operation === "rerollRemovedDie"),
    total: state.score.total,
    actor,
    genre: state.genre,
    category: state.category,
    mouvementIndex: state.mouvementIndex,
    mouvement: state.mouvement,
    advantage: state.advantage,
    // Le dé que l'approche du genre de la session ajoute. La carte le montre
    // parce que c'est le seul des trois apports qu'aucune ligne d'écran ne
    // rappelle : les traits sont listés, le rang du mouvement est nommé.
    bonus: state.genre === state.category ? 1 : 0,
    traits: cardTraits(state),
    carton: state.score.cartons,
    notes: state.score.notes,
    settled: state.settled,
    // « Le CP peut alors retirer jusqu'à deux fausses notes » : passé les deux,
    // la carte ne propose plus rien, le reste part chez Big Shot.
    canCorrect: canCorrect(state),
    // Ce que Big Shot raye d'autorité, tant qu'il reste quelque chose à rayer.
    // Rien à voir avec le plafond de deux : voir `actVoidNote`.
    canVoidNote: !state.settled && state.score.notes > 0,
    canStake: stakeOpen(state) && stakeableTraits(state).length > 0,
    // Ce que corriger coûte dans cette session-ci : une cartouche en classique,
    // un rythme en filler, ou les deux au choix en personnelle.
    correction: correctionChoices(state, actor),
    // Les riffs d'après le jet, chacun avec un bouton par paiement accepté. Les
    // options de Big Shot portent la classe que le hook de rendu retire aux
    // joueurs, comme le bouton de collecte.
    hunterRiffs: cardRiffs(state, "hunter", actor),
    bigshotRiffs: cardRiffs(state, "bigshot", actor),
    // Ce qui a déjà été plaqué, et la dette qu'un camarade a contractée sans
    // que rien ne l'en débite (ADR 0009).
    played: state.played ?? [],
    // Les grooves qui étaient sur la table quand les dés sont tombés. Quatre des
    // onze grooves de chasseur ne peuvent se déclencher qu'ici - « juste après
    // le lancer », « s'il obtient un double » - donc c'est ici qu'ils se lisent.
    // Gelés dans l'état, contrairement aux riffs ouverts qui se relisent en
    // direct : l'assistant peut avoir changé de groove depuis.
    grooves: state.grooves ?? [],
    running: state.running ?? [],
    assist: state.assist
      ? {
          ...state.assist,
          costLabel: state.assist.payment
            ? paymentLabel(state.assist.payment)
            : "",
        }
      : null,
  });
}

/** Constitue le groupement, le lance, et pose la carte dans le chat. */
export async function postTest(actor: any, opened: OpenTest): Promise<void> {
  const state = openTest(opened);
  const roll = new Roll(poolOf(state).formula);
  await roll.roll();

  const scored = applyDice(state, keptDice((roll as any).terms), opened.plannedDie);
  // Ce que les Activations en cours ajoutent au score, une fois les dés tombés.
  const running = cardEffects(
    (state.running ?? []).flatMap((entry) => entry.effects)
  );
  const rolled = addNotes(addCartons(scored, running.cartons), running.notes);

  await roll.toMessage({
    author: cardAuthor(actor),
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await renderCard(rolled, roll),
    flags: { [moduleId]: { [testFlag]: rolled } },
  } as any);
}

/**
 * Réécrit la carte sur place, dés inchangés.
 *
 * Le jet est relu sur le message : c'est lui qui le garde, et une correction ne
 * relance rien.
 */
async function rewrite(message: any, state: TestState): Promise<void> {
  await message.update({
    content: await renderCard(state, message.rolls?.[0]),
    [`flags.${moduleId}.${testFlag}`]: state,
  });
}

/**
 * Cocher une cartouche pour retirer une fausse note.
 *
 * L'état est relu sur le message plutôt que sur le HTML rendu : deux personnes
 * peuvent agir sur la même carte, donc celle qu'on a sous les yeux peut avoir
 * déjà bougé. La vraie simultanéité reste une course, assumée comme dans
 * l'ADR 0002.
 */
export async function actCorrectByCounter(
  message: any,
  actor: any,
  choiceIndex: number
): Promise<void> {
  const state = testOf(message);
  if (!state || !canCorrect(state)) return;

  const choice = correctionChoices(state, actor).counters[choiceIndex];
  if (!choice || choice.blocked) return;
  // La réserve est relue au moment de payer, pas à celui où le bouton a été
  // dessiné : la carte qu'on a sous les yeux peut dater d'avant la dernière
  // dépense de quelqu'un d'autre.
  if (paymentOptionBlocked(choice.payments, actor)) return;
  if (!(await payOption(choice.payments, actor))) return;

  await rewrite(message, correctByCartridge(state));
}

/**
 * Plaquer un riff d'après le jet : Forcer, ou ce que Big Shot achète.
 *
 * Le prix part d'abord et conditionne l'effet - une réserve vidée entre-temps
 * doit arrêter le geste, pas le laisser poser un carton gratuit. Un prix payé
 * en fausses notes n'est pas un débit mais un ajout : c'est exactement ce que
 * « déclencher deux fausses notes » veut dire.
 */
export async function actPlayRiff(
  message: any,
  actor: any,
  riffId: string,
  choice: number
): Promise<void> {
  const state = testOf(message);
  if (!state || state.settled) return;

  // Le bord se retrouve en cherchant dans les deux, pas en devinant depuis
  // l'identifiant : un riff libre n'en porte aucun que le livre reconnaisse, et
  // le bouton de Big Shot est déjà retiré aux joueurs par le hook de rendu.
  const riff = (["hunter", "bigshot"] as RiffAudience[])
    .flatMap((audience) => cardRiffs(state, audience, actor))
    .find((candidate) => candidate.id === riffId);
  if (!riff) return;

  const chosen = riff.choices[choice];
  if (!chosen || chosen.blocked) return;

  const payments = chosen.payments ?? (chosen.amount > 0
    ? [{ resource: chosen.resource, amount: chosen.amount }]
    : []);
  const payment: Payment | undefined = payments.length === 1 ? payments[0] : undefined;

  if (!(await confirmPlayOption(riff.name, payments))) return;

  // L'état est relu après la confirmation : le dialogue laisse le temps à
  // quelqu'un d'autre de corriger, de miser, ou de solder la carte.
  const fresh = testOf(message);
  if (!fresh || fresh.settled) return;

  let after = fresh;

  const notesPaid = payments
    .filter((entry) => entry.resource === "note")
    .reduce((total, entry) => total + entry.amount, 0);
  if (!(await payOption(payments.filter((entry) => entry.resource !== "note"), actor, riff.owed))) {
    return;
  }
  after = addNotes(after, notesPaid);

  const effects = cardEffects(riff.effects);
  after = addNotes(addCartons(after, effects.cartons), effects.notes);

  await rewrite(
    message,
    logRiff(after, { id: riff.id, name: riff.name, payment, payments })
  );
}

/**
 * Rayer une fausse note, par décision de Big Shot.
 *
 * Ce n'est ni une correction ni un riff. Pas une correction : rien n'est payé,
 * et le plafond de deux ne s'y applique pas - ce plafond borne ce qu'un
 * chasseur rachète, pas ce que l'arbitre annule. Pas un riff non plus : aucun
 * type de session ne l'ouvre ni ne le ferme, parce que « les conditions ne la
 * justifiaient pas » doit rester disponible à tous les mouvements de toutes les
 * sessions, y compris - surtout - celles qui n'ouvrent rien à Big Shot.
 *
 * Rien n'en est consigné dans `played` : ce qui a été joué s'y accumule, une
 * note rayée n'a jamais eu lieu.
 *
 * Le geste écrit sur la carte d'un joueur, donc il est réservé aux MJ ici comme
 * il l'est dans le gabarit : le hook de rendu retire le bouton, cette garde
 * refuse le geste.
 */
export async function actVoidNote(message: any): Promise<void> {
  if (!(game as any).user?.isGM) return;

  const state = testOf(message);
  if (!state) return;

  // `addNotes` plafonne à zéro et rend l'état inchangé quand il n'y a plus rien
  // à retirer : le bouton disparaît alors de lui-même à la réécriture.
  const after = addNotes(state, -1);
  if (after === state) return;

  await rewrite(message, after);
}

/** Entamer un trait pour retirer une fausse note. */
export async function actCorrectByTrait(
  message: any,
  actor: any,
  key: string
): Promise<void> {
  const state = testOf(message);
  if (!state) return;

  let secondKey: string | undefined;
  if (state.grooveRules?.smallerBites) {
    const partners = correctionPartners(state, key);
    if (partners.length === 0) return;
    const options = partners.map((trait) =>
      `<option value="${(foundry as any).utils.escapeHTML(trait.key)}">${(foundry as any).utils.escapeHTML(trait.name)}</option>`
    ).join("");
    secondKey = await Dialog.prompt({
      title: localize("COWBOY.groove.smaller.title"),
      content: `<label>${localize("COWBOY.groove.smaller.second")}<select name="trait">${options}</select></label>`,
      callback: (html: JQuery) => String(html.find("select[name='trait']").val() ?? ""),
      rejectClose: false,
    } as any) as unknown as string | undefined;
    if (!secondKey) return;
  }

  const after = correctByTrait(state, key, secondKey);
  if (after === state) return;

  await actor?.damagePoolTrait(traitOf(after, key), true, false);
  if (secondKey) await actor?.damagePoolTrait(traitOf(after, secondKey), true, false);
  await rewrite(message, after);
}

/**
 * Quitte ou double : mettre un trait en jeu et relancer le groupement.
 *
 * Ce n'est pas une correction et rien ne le lie au plafond de deux : c'est un
 * riff, ouvert ou non par le type de session. Le trait misé n'est rayé qu'au vu
 * du résultat, donc il donne encore son dé au jet qui décide de son sort.
 */
export async function actStake(
  message: any,
  actor: any,
  key: string
): Promise<void> {
  const state = testOf(message);
  if (!state || !stakeOpen(state)) return;
  if (!stakeableTraits(state).some((trait) => trait.key === key)) return;

  const roll = new Roll(rerollPool(state).formula);
  await roll.roll();

  const after = resolveReroll(state, key, keptDice((roll as any).terms));
  const staked = traitOf(after, key);

  if (staked?.state === "broken") {
    await actor?.damagePoolTrait(staked, true, true);
  }

  await message.update({
    rolls: [roll],
    content: await renderCard(after, roll),
    [`flags.${moduleId}.${testFlag}`]: after,
  });
}

/** Hors des sentiers battus : une nouvelle étape, jamais un score écrasé. */
export async function actRewriteDie(message: any, index: number): Promise<void> {
  const state = testOf(message);
  if (!state || state.settled) return;
  const allowed = (state.activations ?? []).some((activation) =>
    activation.effects.some((effect) => effect.kind === "transformResult" && effect.operation === "rewriteDie")
  );
  if (!allowed) return;
  const transformed = rewriteDie(state, index, 6, "Hors des sentiers battus");
  const after = transformed === state ? state : addNotes(transformed, 1);
  if (after === state) return;
  await rewrite(message, after);
}

/** Maître de la bidouille : relance le dé écarté et ajoute une étape. */
export async function actRerollRemovedDie(message: any): Promise<void> {
  const state = testOf(message);
  if (!state || state.settled || state.advantage >= 0) return;
  const allowed = (state.activations ?? []).some((activation) =>
    activation.effects.some((effect) => effect.kind === "transformResult" && effect.operation === "rerollRemovedDie")
  );
  if (!allowed) return;
  const roll = new Roll("1d6");
  await roll.roll();
  const face = keptDice((roll as any).terms)[0];
  if (!face) return;
  const keep = await Dialog.confirm({
    title: "Maître de la bidouille",
    content: `<p>${localize("COWBOY.activation.keepRerolledDie")} <strong>${face}</strong> ?</p>`,
    defaultYes: true,
  } as any) as unknown as boolean;
  if (!keep) return;
  await rewrite(message, rerollRemovedDie(state, face, "Maître de la bidouille"));
}

/** Plan sur le long terme : mémorise un résultat réellement lancé. */
export async function actReservePlan(message: any, actor: any, index: number): Promise<void> {
  const state = testOf(message);
  if (!state || state.settled || !state.canReservePlan || actor?.id !== state.actorId) return;
  const current = state.history?.[state.history.length - 1];
  if (!current || index < 0 || index >= current.dice.length || index === current.plannedIndex) return;
  const face = Math.trunc(Number(current.dice[index]));
  if (face < 1 || face > 6) return;

  const previous = Math.trunc(Number(actor.system?.plannedDie ?? 0));
  if (previous >= 1 && previous <= 6) {
    const confirmed = await Dialog.confirm({
      title: localize("COWBOY.groove.plan.title"),
      content: `<p>${(game as any).i18n.format("COWBOY.groove.plan.replace", { previous, face })}</p>`,
      defaultYes: true,
    } as any) as unknown as boolean;
    if (!confirmed) return;
  }

  await actor.update({ "system.plannedDie": face });
}

/**
 * De quoi marquer la carte soldée, à joindre à la réécriture de son contenu.
 *
 * Une seule écriture et pas deux : le contenu et l'état doivent basculer
 * ensemble, sinon une carte peut exister un instant avec ses jetons soldés et
 * son bouton encore là.
 */
export function settleUpdate(message: any): Record<string, unknown> {
  const state = testOf(message);
  if (!state) return {};

  return { [`flags.${moduleId}.${testFlag}`]: settle(state) };
}

function traitOf(state: TestState, key: string) {
  return state.traits.find((trait) => trait.key === key);
}
