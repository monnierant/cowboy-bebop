import { COUNTER_OF, isCounter } from "./rolls/activationTerms";
import { getActivePrime } from "./prime";
import { Payment, PaymentResource, RiffCard } from "./types";
import type { BespokeGrooveRules } from "./types";
import { bigshotPaymentOptions, hunterPaymentOptions } from "./rolls/bespokeGrooves";

/**
 * Ce qu'un riff coûte, et à qui.
 *
 * Deux réserves seulement portent un prix de riff : la fiche du chasseur, pour
 * la cartouche et le rythme, et la prime en jeu, pour le risque. Les trois
 * autres ressources - un trait entamé, un trait misé, une fausse note - se
 * prennent sur le test lui-même et n'existent pas hors d'une carte ; ce module
 * ne les débite donc pas, il se contente de dire qu'il ne sait pas les compter.
 *
 * La règle qui gouverne tout ce fichier tient en une phrase : **on n'écrit que
 * sur la fiche qu'on joue** (ADR 0009). Un riff dû par quelqu'un d'autre est
 * enregistré et rappelé, jamais débité.
 */

const localize = (key: string, data?: Record<string, unknown>): string =>
  data
    ? (game as any)?.i18n?.format(key, data) ?? key
    : (game as any)?.i18n?.localize(key) ?? key;

/** Qui tient cette ressource : le chasseur qui joue, ou la prime en jeu. */
function holderOf(resource: PaymentResource, actor: any): any {
  return resource === "risque" ? getActivePrime() : actor;
}

/** Combien il en reste, ou `undefined` si ça ne se compte pas d'avance. */
export function held(
  resource: PaymentResource,
  actor: any
): number | undefined {
  const counter = COUNTER_OF[resource];
  if (!counter) return undefined;

  return Number(holderOf(resource, actor)?.system?.[counter] ?? 0);
}

/**
 * Pourquoi ce paiement est impossible, ou rien s'il l'est.
 *
 * Un motif et pas un booléen : un bouton grisé sans raison se lit comme une
 * panne, et « pourquoi Spike ne peut-il pas payer » est une question que la
 * table pose vraiment - c'est déjà l'argument de `payersFor` dans `economy.ts`.
 */
export function payBlocked(
  payment: Payment,
  actor: any,
  pledged: Pledged = {}
): string | undefined {
  // Ce qui se prend sur le test ne se compte pas ici : c'est la carte qui sait
  // s'il reste un trait à entamer ou une fausse note à déclencher.
  if (!isCounter(payment.resource)) return undefined;

  const owner = holderOf(payment.resource, actor);
  if (!owner) return localize("COWBOY.riffs.noPrime");

  // Ce qui est déjà promis compte comme dépensé. Rien n'est débité avant que la
  // boîte de jet soit validée, donc sans ça un chasseur à une cartouche
  // pourrait plaquer S'impliquer trois fois et ne le découvrir qu'au lancer.
  const available = (held(payment.resource, actor) ?? 0) - (pledged[payment.resource] ?? 0);
  if (available < payment.amount) {
    return localize("COWBOY.riffs.cannotAfford", {
      cost: paymentLabel(payment),
      held: Math.max(0, available),
    });
  }

  return undefined;
}

/** Ce que les riffs déjà plaqués ont promis, par ressource. */
export type Pledged = Partial<Record<PaymentResource, number>>;

export function pledge(payments: Array<Payment | undefined>): Pledged {
  const total: Pledged = {};

  payments.forEach((payment) => {
    if (!payment) return;
    total[payment.resource] = (total[payment.resource] ?? 0) + payment.amount;
  });

  return total;
}

/** Un prix tel qu'il se lit sur un bouton : « 2 cartouches ». */
export function paymentLabel(payment: Payment): string {
  const noun = localize(`COWBOY.riffs.payments.${payment.resource}`);
  return payment.amount === 1 ? noun : `${payment.amount} ${noun}`;
}

export function paymentOptionLabel(option: Payment[]): string {
  return option.length === 0
    ? localize("COWBOY.riffs.free")
    : option.map(paymentLabel).join(" + ");
}

/** Une option composée est payable entièrement ou pas du tout. */
export function paymentOptionBlocked(
  option: Payment[],
  actor: any,
  pledged: Pledged = {}
): string | undefined {
  const within: Pledged = { ...pledged };
  for (const payment of option) {
    const blocked = payBlocked(payment, actor, within);
    if (blocked) return blocked;
    within[payment.resource] = (within[payment.resource] ?? 0) + payment.amount;
  }
  return undefined;
}

/** Un riff, avec chacun de ses paiements et ce qui le barre. */
export interface PlayableRiff extends RiffCard {
  choices: Array<Payment & { payments: Payment[]; label: string; blocked?: string; index: number }>;
  /** Vrai quand aucun paiement n'est possible : la ligne se grise en entier. */
  stuck: boolean;
}

/**
 * Ce que ce chasseur peut effectivement plaquer, et ce qui l'en empêche.
 *
 * Un riff gratuit garde une entrée sans ressource : il lui faut un bouton comme
 * aux autres, sans quoi un riff qui ne coûte rien serait le seul injouable.
 */
export function playable(
  riffs: RiffCard[],
  actor: any,
  pledged: Pledged = {},
  rules: BespokeGrooveRules = {}
): PlayableRiff[] {
  return riffs.map((riff) => {
    const paymentOptions = riff.audience === "bigshot"
      ? bigshotPaymentOptions(riff.paymentOptions, rules)
      : riff.owed
        ? riff.paymentOptions
        : hunterPaymentOptions(riff.paymentOptions, String(actor?.id ?? ""), rules);
    const choices = paymentOptions.map((payments, index) => ({
      ...(payments[0] ?? { resource: "cartridge" as PaymentResource, amount: 0 }),
      payments,
      index,
      label: paymentOptionLabel(payments),
      // Un riff dû par quelqu'un d'autre n'est jamais barré par nos réserves :
      // ce n'est pas nous qui payons.
      blocked: riff.activationValid === false
        ? localize("COWBOY.activation.invalid")
        : riff.owed ? undefined : paymentOptionBlocked(payments, actor, pledged),
    }));

    if (choices.length === 0) {
      const blocked = riff.activationValid === false
        ? localize("COWBOY.activation.invalid")
        : undefined;
      return {
        ...riff,
        choices: [
          {
            resource: "cartridge" as PaymentResource,
            amount: 0,
            payments: [],
            index: 0,
            label: localize("COWBOY.riffs.free"),
            blocked,
          },
        ],
        stuck: blocked !== undefined,
      };
    }

    return {
      ...riff,
      choices,
      stuck: choices.every((choice) => choice.blocked !== undefined),
    };
  });
}

/**
 * Débite ce paiement, si tant est qu'il se débite.
 *
 * Rend faux quand rien n'a bougé - réserve vide, ressource qui n'est pas un
 * compteur, ou prix dû par quelqu'un d'autre - pour que l'appelant sache s'il
 * doit renoncer à l'effet.
 */
export async function pay(
  payment: Payment,
  actor: any,
  owed: boolean = false
): Promise<boolean> {
  // On n'écrit que sur la fiche qu'on joue : la dette d'un camarade est
  // enregistrée et rappelée, elle ne se prélève pas (ADR 0009).
  if (owed) return true;

  const counter = COUNTER_OF[payment.resource];
  if (!counter) return true;

  const owner = holderOf(payment.resource, actor);
  const current = Number(owner?.system?.[counter] ?? 0);
  if (!owner || current < payment.amount) return false;

  await owner.update({ [`system.${counter}`]: current - payment.amount });
  return true;
}

/**
 * Débite une option composée après avoir validé tous ses compteurs.
 *
 * Une écriture par détenteur, pas une par ressource : cartouche et rythme vivent
 * sur la même fiche, et deux `update` successifs laisseraient la fiche à moitié
 * débitée si le second échouait. Regrouper évite en outre que deux lignes visant
 * le même compteur se lisent toutes deux sur l'ancienne valeur.
 */
export async function payOption(
  option: Payment[],
  actor: any,
  owed: boolean = false
): Promise<boolean> {
  if (owed) return true;
  if (paymentOptionBlocked(option, actor)) return false;

  const totals = new Map<PaymentResource, number>();
  option.filter((payment) => isCounter(payment.resource)).forEach((payment) =>
    totals.set(payment.resource, (totals.get(payment.resource) ?? 0) + payment.amount)
  );

  // Un `update` par fiche, préparé en entier avant la moindre écriture.
  const writes = new Map<any, Record<string, number>>();
  for (const [resource, amount] of totals) {
    const counter = COUNTER_OF[resource];
    if (!counter) continue;

    const owner = holderOf(resource, actor);
    const current = Number(owner?.system?.[counter] ?? 0);
    if (!owner || current < amount) return false;

    writes.set(owner, { ...(writes.get(owner) ?? {}), [`system.${counter}`]: current - amount });
  }

  for (const [owner, update] of writes) await owner.update(update);
  return true;
}

/**
 * Débite d'un seul coup ce que plusieurs riffs plaqués coûtent ensemble.
 *
 * Payer riff par riff n'est atomique que pour chacun : le troisième pouvait
 * échouer alors que les deux premiers étaient déjà écrits sur la fiche, et le
 * chasseur perdait ses jetons sans lancer. Les prix dus par quelqu'un d'autre
 * sont écartés du total, jamais débités (ADR 0009).
 */
export async function payTogether(
  options: Array<{ payments: Payment[]; owed?: boolean }>,
  actor: any
): Promise<boolean> {
  return payOption(
    options.filter((entry) => !entry.owed).flatMap((entry) => entry.payments),
    actor
  );
}

/**
 * Demande confirmation avant de payer.
 *
 * Sur une carte, un bouton part au premier clic et la ressource avec lui. Dans
 * la boîte de jet, rien n'est débité avant *Lancer*, qui vaut confirmation -
 * ce dialogue n'y est donc pas appelé.
 */
export async function confirmPlay(
  name: string,
  payment: Payment | undefined
): Promise<boolean> {
  const cost =
    payment && payment.amount > 0
      ? paymentLabel(payment)
      : localize("COWBOY.riffs.free");

  return Dialog.confirm({
    title: name,
    content: `<p>${localize("COWBOY.riffs.confirmPlay", { name, cost })}</p>`,
    defaultYes: true,
  } as any) as unknown as Promise<boolean>;
}

export async function confirmPlayOption(name: string, option: Payment[]): Promise<boolean> {
  return Dialog.confirm({
    title: name,
    content: `<p>${localize("COWBOY.riffs.confirmPlay", {
      name,
      cost: paymentOptionLabel(option),
    })}</p>`,
    defaultYes: true,
  } as any) as unknown as Promise<boolean>;
}
