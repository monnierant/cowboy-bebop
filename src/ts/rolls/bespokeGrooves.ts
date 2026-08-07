import type { BespokeGrooveRules, Payment } from "../types";
import { score, type MouvementRules, type Score } from "./score.js";

export const BESPOKE_GROOVES = {
  orbital: "groovePrime003",
  dangerousGoods: "groovePrime008",
  shadows: "groovePrime022",
  vengeance: "groovePrime015",
  smallerBites: "groovePrime018",
  longTermPlan: "grooveHunter09",
} as const;

const currency = (payment: Payment): boolean =>
  payment.resource === "cartridge" || payment.resource === "rythme";

/** Une forme stable et sans doublons pour les boutons de paiement. */
function unique(options: Payment[][]): Payment[][] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option
      .filter((payment) => payment.amount > 0)
      .map((payment) => `${payment.resource}:${payment.amount}`)
      .sort()
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Les choix réellement proposés à un chasseur sous Vengeance/Ombres.
 *
 * Vengeance rend les unités de rythme et de cartouche fongibles. Ombres se
 * résout ensuite et ajoute exactement deux cartouches non convertibles à toute
 * option qui dépense effectivement du rythme (ADR 0014).
 */
export function hunterPaymentOptions(
  options: Payment[][],
  actorId: string,
  rules: BespokeGrooveRules = {}
): Payment[][] {
  const vengeance = rules.vengeanceHunterId === actorId;
  const shadowed = (rules.shadowsHunterIds ?? []).includes(actorId);

  const expanded = options.flatMap((option) => {
    if (!vengeance) return [option.map((payment) => ({ ...payment }))];

    const total = option
      .filter(currency)
      .reduce((sum, payment) => sum + Math.max(0, payment.amount), 0);
    if (total === 0) return [option.map((payment) => ({ ...payment }))];

    const fixed = option.filter((payment) => !currency(payment));
    return Array.from({ length: total + 1 }, (_unused, rythme) => [
      ...fixed.map((payment) => ({ ...payment })),
      ...(total - rythme > 0
        ? [{ resource: "cartridge" as const, amount: total - rythme }]
        : []),
      ...(rythme > 0 ? [{ resource: "rythme" as const, amount: rythme }] : []),
    ]);
  });

  return unique(
    expanded.map((option) =>
      shadowed && option.some((payment) => payment.resource === "rythme" && payment.amount > 0)
        ? [...option, { resource: "cartridge", amount: 2 }]
        : option
    )
  );
}

/** Le secret accepté double uniquement les paiements de jeu de Big Shot. */
export function bigshotPaymentOptions(
  options: Payment[][],
  rules: BespokeGrooveRules = {}
): Payment[][] {
  if (!rules.shadowsAccepted) return options.map((option) => option.map((p) => ({ ...p })));
  return options.map((option) =>
    option.map((payment) =>
      payment.resource === "risque"
        ? { ...payment, amount: payment.amount * 2 }
        : { ...payment }
    )
  );
}

/** Les 1 sont neutralisés seulement pour l'approche du genre de la session. */
export function scoringDice(
  dice: number[],
  category: string,
  genre: string,
  rules: BespokeGrooveRules = {}
): number[] {
  if (!rules.orbitalSafe || category !== genre) return [...dice];
  return dice.filter((face) => face !== 1);
}

/** Neutralise seulement les fausses notes des 1, jamais leur valeur au total. */
export function grooveScore(
  dice: number[],
  mouvement: MouvementRules,
  category: string,
  genre: string,
  rules: BespokeGrooveRules = {}
): Score {
  const ordinary = score(dice, mouvement);
  const notes = score(scoringDice(dice, category, genre, rules), mouvement).notes;
  return { ...ordinary, notes };
}

/** Une troisième correction, et seulement si elle commence par un trait de MONO. */
export function correctionLimit(rules: BespokeGrooveRules = {}): number {
  return rules.dangerousGoods ? 3 : 2;
}
