/** Le vocabulaire mécanique partagé par les riffs et les grooves (ADR 0012). */
import type {
  Activation,
  ActivationCondition,
  ConditionKind,
  Effect,
  EffectKind,
  ActivationScope,
  Payment,
  PaymentResource,
  Prohibition,
  QuantifiedEffectKind,
  ResultTransformation,
  RiffPhase,
} from "../types";
import type { Advantage, Score } from "./score";

export const paymentResources: PaymentResource[] = [
  "cartridge", "rythme", "risque", "dentTrait", "stakeTrait", "note",
];

export const quantifiedEffectKinds: QuantifiedEffectKind[] = [
  "dice", "advantage", "difficulty", "cartons", "notes", "heal",
  "approach", "minimumNotes", "notesPerMissingCarton",
];

export const effectKinds: EffectKind[] = [
  ...quantifiedEffectKinds,
  "disadvantageDoubleCarton",
  "dentedTraitsOnDisadvantage",
  "forbid",
  "transformResult",
];

export const conditionKinds: ConditionKind[] = [
  "underDisadvantage", "sessionGenre", "offSessionGenre",
];

export const prohibitions: Prohibition[] = [
  "disadvantage", "damageRemoval", "cartonAgainstDifficulty",
];

export const resultTransformations: ResultTransformation[] = [
  "rerollPool", "rerollRemovedDie", "rewriteDie",
];

export const activationScopes: ActivationScope[] = ["test", "mouvement", "session"];

export const EFFECT_PHASE: Record<EffectKind, RiffPhase> = {
  dice: "roll",
  advantage: "roll",
  difficulty: "roll",
  cartons: "card",
  notes: "card",
  heal: "roll",
  approach: "roll",
  minimumNotes: "card",
  notesPerMissingCarton: "card",
  disadvantageDoubleCarton: "card",
  dentedTraitsOnDisadvantage: "roll",
  forbid: "roll",
  transformResult: "card",
};

export const COUNTER_OF: Partial<Record<PaymentResource, string>> = {
  cartridge: "cartridge", rythme: "rythme", risque: "risque",
};

const amountOf = (value: unknown): number => {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : 1;
};

export function normalizePayments(stored: unknown): Payment[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((entry: any) => paymentResources.includes(entry?.resource))
    .map((entry: any) => ({
      resource: entry.resource as PaymentResource,
      amount: Math.abs(amountOf(entry.amount)),
    }));
}

export function normalizePaymentOptions(stored: unknown): Payment[][] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(Array.isArray)
    .map((option) => normalizePayments(option));
}

export function normalizeEffect(stored: unknown): Effect | undefined {
  const kind = (stored as any)?.kind as EffectKind;
  if (quantifiedEffectKinds.includes(kind as QuantifiedEffectKind)) {
    return { kind: kind as QuantifiedEffectKind, amount: amountOf((stored as any)?.amount) };
  }
  if (kind === "disadvantageDoubleCarton" || kind === "dentedTraitsOnDisadvantage") {
    return { kind };
  }
  if (kind === "forbid" && prohibitions.includes((stored as any)?.target)) {
    return { kind, target: (stored as any).target };
  }
  if (
    kind === "transformResult" &&
    resultTransformations.includes((stored as any)?.operation)
  ) {
    return { kind, operation: (stored as any).operation };
  }
  return undefined;
}

export function normalizeEffects(stored: unknown): Effect[] {
  if (!Array.isArray(stored)) return [];
  return stored.map(normalizeEffect).filter((effect): effect is Effect => !!effect);
}

export function normalizeConditions(stored: unknown): ActivationCondition[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((entry: any) => conditionKinds.includes(entry?.kind))
    .map((entry: any) => ({ kind: entry.kind as ConditionKind }));
}

/** Convertit aussi les formes ADR 0008/0010/0011 pendant l'édition en cours. */
export function normalizeActivation(stored: unknown): Activation {
  const source: any = stored ?? {};
  const legacyRules = Array.isArray(source.rules)
    ? source.rules.filter((rule: any) => rule?.enabled !== false).flatMap((rule: any) => {
        if (rule.kind === "noDisadvantage") return [{ kind: "forbid", target: "disadvantage" }];
        if (rule.kind === "minimumNotes" || rule.kind === "notesPerMissingCarton") {
          return [{ kind: rule.kind, amount: amountOf(rule.amount) }];
        }
        if (rule.kind === "disadvantageDoubleCarton" || rule.kind === "dentedTraitsOnDisadvantage") {
          return [{ kind: rule.kind }];
        }
        return [];
      })
    : [];
  const payments = source.paymentOptions !== undefined
    ? normalizePaymentOptions(source.paymentOptions)
    : normalizePayments(source.payments).map((payment) => [payment]);
  const scope = activationScopes.includes(source.scope) ? source.scope : undefined;

  const legacyFilter = source.filter === "genre"
    ? [{ kind: "sessionGenre" as const }]
    : source.filter === "offGenre"
      ? [{ kind: "offSessionGenre" as const }]
      : [];
  return {
    conditions: source.conditions !== undefined ? normalizeConditions(source.conditions) : legacyFilter,
    paymentOptions: payments,
    effects: canonicalEffects([...normalizeEffects(source.effects), ...normalizeEffects(legacyRules)]),
    ...(scope ? { scope } : {}),
    ...(scope && source.untilSecret === true ? { untilSecret: true } : {}),
    ...(scope && source.secret === true ? { secret: true } : {}),
  };
}

/** Une entrée invalide reste stockée, mais le moteur refuse de l'exécuter. */
export function activationErrors(stored: unknown): string[] {
  const source: any = stored;
  if (!source || typeof source !== "object") return ["activation"];
  const errors: string[] = [];
  if (!Array.isArray(source.effects) && !Array.isArray(source.rules)) errors.push("effects");
  if (Array.isArray(source.effects) && source.effects.some((effect: any) => {
    if (!normalizeEffect(effect)) return true;
    if (quantifiedEffectKinds.includes(effect.kind)) {
      const amount = Number(effect.amount);
      return !Number.isFinite(amount) || Math.trunc(amount) === 0;
    }
    return "amount" in effect;
  })) errors.push("effects");
  if (source.conditions !== undefined && (!Array.isArray(source.conditions) || source.conditions.some((entry: any) => !conditionKinds.includes(entry?.kind)))) errors.push("conditions");
  if (source.paymentOptions !== undefined && (!Array.isArray(source.paymentOptions) || source.paymentOptions.some((option: unknown) =>
    !Array.isArray(option) || option.some((payment: any) =>
      !paymentResources.includes(payment?.resource) ||
      !Number.isFinite(Number(payment?.amount)) ||
      Math.trunc(Number(payment.amount)) <= 0
    )
  ))) errors.push("paymentOptions");
  if (source.scope !== undefined && !activationScopes.includes(source.scope)) errors.push("scope");
  if (source.scope === undefined && (source.untilSecret !== undefined || source.secret !== undefined)) errors.push("scope");
  return Array.from(new Set(errors));
}

export const isActivationValid = (stored: unknown): boolean => activationErrors(stored).length === 0;
export const isCounter = (resource: PaymentResource): boolean => COUNTER_OF[resource] !== undefined;
export const isFree = (activation: Activation): boolean => activation.paymentOptions.length === 0 || activation.paymentOptions.some((option) => option.length === 0);

export interface ActivationContext {
  advantage: Advantage;
  category: string;
  genre: string;
}

export function conditionsMatch(conditions: ActivationCondition[], context: ActivationContext): boolean {
  return conditions.every(({ kind }) => {
    if (kind === "underDisadvantage") return context.advantage < 0;
    if (kind === "sessionGenre") return context.category === context.genre;
    return context.category !== context.genre;
  });
}

export function activeEffects(activations: Activation[], context: ActivationContext): Effect[] {
  return canonicalEffects(activations
    .filter((activation) => conditionsMatch(activation.conditions, context))
    .flatMap((activation) => activation.effects));
}

/** interdictions, remplacements, variations, bornes. */
export function canonicalEffects(effects: Effect[]): Effect[] {
  const rank = (effect: Effect): number => {
    if (effect.kind === "forbid") return 0;
    if (effect.kind === "transformResult") return 1;
    if (effect.kind === "minimumNotes") return 3;
    return 2;
  };
  return effects.map((effect, index) => ({ effect, index }))
    .sort((a, b) => rank(a.effect) - rank(b.effect) || a.index - b.index)
    .map(({ effect }) => effect);
}

export function activationPhase(activation: Activation, override?: RiffPhase): RiffPhase {
  if (override) return override;
  return activation.effects.some((effect) => EFFECT_PHASE[effect.kind] === "card") ? "card" : "roll";
}

const quantity = (effect: Effect, kind: QuantifiedEffectKind): number =>
  effect.kind === kind ? effect.amount : 0;

export function rollEffects(effects: Effect[]) {
  const sum = (kind: QuantifiedEffectKind) => effects.reduce((total, effect) => total + quantity(effect, kind), 0);
  return { dice: sum("dice"), advantage: sum("advantage"), difficulty: sum("difficulty"), heal: sum("heal"), approach: sum("approach") };
}

export function cardEffects(effects: Effect[]) {
  const sum = (kind: QuantifiedEffectKind) => effects.reduce((total, effect) => total + quantity(effect, kind), 0);
  return { cartons: sum("cartons"), notes: sum("notes") };
}

export function isForbidden(effects: Effect[], target: Prohibition): boolean {
  return effects.some((effect) => effect.kind === "forbid" && effect.target === target);
}

export function applyAdvantageEffects(advantage: Advantage, effects: Effect[]): Advantage {
  return advantage < 0 && isForbidden(effects, "disadvantage") ? 0 : advantage;
}

export function permitsDentedTraits(advantage: Advantage, effects: Effect[]): boolean {
  return advantage < 0 && effects.some((effect) => effect.kind === "dentedTraitsOnDisadvantage");
}

export function applyResultEffects(dice: number[], result: Score, advantage: Advantage, effects: Effect[]): Score {
  let cartons = result.cartons;
  let notes = result.notes;
  for (const effect of canonicalEffects(effects)) {
    if (effect.kind === "disadvantageDoubleCarton" && advantage < 0 && [1, 2, 3, 4, 5].some((face) => dice.filter((die) => die === face).length >= 2)) cartons = Math.min(2, cartons + 1);
    if (effect.kind === "notesPerMissingCarton") notes += Math.max(0, effect.amount - cartons);
    if (effect.kind === "minimumNotes") notes = Math.max(notes, effect.amount);
  }
  return { ...result, cartons, notes };
}

export type ActivationEvent = "test" | "mouvement" | "session" | "secret";
export function survives(activation: Activation, event: ActivationEvent): boolean {
  if (!activation.scope) return false;
  if (event === "secret") return activation.untilSecret !== true;
  if (event === "session") return false;
  if (event === "mouvement") return activation.scope === "session";
  return activation.scope !== "test";
}
