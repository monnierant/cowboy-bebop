/**
 * L'éditeur d'Activation, partagé par les riffs et les grooves (ADR 0012).
 *
 * Le vocabulaire est fermé — trois conditions, six paiements, treize effets,
 * quatre durées — donc il se dessine plutôt que de s'écrire en JSON. Riffs et
 * Grooves gardent leurs enveloppes métier distinctes, mais ce qu'ils portent
 * est la même mécanique, et elle n'est éditée qu'ici.
 *
 * Ce module ne sait pas *où* une activation est rangée : chaque ligne porte une
 * cible sérialisée que son appelant a fabriquée et qu'il seul sait relire. Une
 * feuille de groove l'adresse par son rang, un type de session par son
 * mouvement et l'identifiant de son riff ; le formulaire est le même.
 */
import {
  activationErrors,
  activationScopes,
  conditionKinds,
  effectKinds,
  normalizeConditions,
  normalizeEffects,
  normalizePaymentOptions,
  paymentResources,
  prohibitions,
  quantifiedEffectKinds,
  resultTransformations,
} from "./rolls/activationTerms";
import type {
  Activation,
  ActivationScope,
  Effect,
  EffectKind,
  QuantifiedEffectKind,
} from "./types";

const localize = (key: string): string =>
  (game as any)?.i18n?.localize(key) ?? key;

/**
 * Chaque menu porte sa sélection déjà résolue. C'est redondant, et c'est le
 * but : le gabarit dessine ses options sans remonter d'un `../` vers la ligne
 * qui le contient, remontée qu'un bloc ajouté suffirait à décaler en silence.
 */
export const chosen = (
  options: { value: string; label: string }[],
  value: string
) => options.map((option) => ({ ...option, selected: option.value === value }));

export const labelled = <T extends string>(values: T[], prefix: string) =>
  values.map((value) => ({ value, label: localize(`${prefix}.${value}`) }));

const isQuantified = (kind: EffectKind): kind is QuantifiedEffectKind =>
  quantifiedEffectKinds.includes(kind as QuantifiedEffectKind);

/**
 * Une activation stockée, relue pour l'édition.
 *
 * `normalizeActivation` ne convient pas ici : elle range les effets dans
 * l'ordre canonique, et une ligne qui saute de place au moment où on la règle
 * ferait douter du clic. L'ordre de saisie ne décide de rien - le moteur
 * reclasse à l'exécution - donc l'éditeur le garde tel quel.
 */
export function editableActivation(stored: unknown): Activation {
  const source: any = stored ?? {};
  const scope: ActivationScope | undefined = activationScopes.includes(source.scope)
    ? source.scope
    : undefined;

  return {
    conditions: normalizeConditions(source.conditions),
    paymentOptions: normalizePaymentOptions(source.paymentOptions),
    effects: normalizeEffects(source.effects),
    ...(scope ? { scope } : {}),
    ...(scope && source.untilSecret === true ? { untilSecret: true } : {}),
    ...(scope && source.secret === true ? { secret: true } : {}),
  };
}

/** Une activation vierge : instantanée, sans condition et gratuite. */
export const emptyActivation = (): Activation => ({
  conditions: [],
  paymentOptions: [],
  effects: [],
});

/**
 * Ce qu'un effet devient quand on change sa nature.
 *
 * Un effet ne porte un montant que si son type en admet un (ADR 0012) :
 * changer `dés` en `interdire` doit donc remplacer le montant par ce qui est
 * interdit, et non traîner un `1` sans signification.
 */
export function defaultEffect(kind: EffectKind): Effect {
  if (isQuantified(kind)) return { kind, amount: 1 };
  if (kind === "forbid") return { kind, target: prohibitions[0] };
  if (kind === "transformResult") return { kind, operation: resultTransformations[0] };

  return { kind };
}

export interface ActivationRowOptions {
  /** La cible sérialisée que les champs recopient dans leurs `data-target`. */
  target: string;
  /** Le titre de la carte. Absent sur une activation unique, qui est nommée par sa ligne. */
  title?: string;
  /** Vrai quand l'activation est seule : ni bouton d'ajout, ni bouton de retrait. */
  single?: boolean;
  /**
   * Vrai quand la durée ne se règle pas : un riff s'applique au test qu'on
   * joue, et le livre ne lui donne jamais d'horloge. Seul un groove persiste.
   */
  instantOnly?: boolean;
  /** Vrai quand le moteur câble ses effets en dur : Quitte ou double, Solo !. */
  bespoke?: boolean;
  /** Vrai quand le prix est dû par un autre chasseur, rappelé et jamais débité. */
  owed?: boolean;
  /** Vrai quand la cible sait rendre le prix du livre. */
  resettable?: boolean;
}

/**
 * Une activation telle que son formulaire la dessine.
 *
 * Une activation invalide est conservée pour réparation mais entièrement
 * bloquée (ADR 0012) : la dessiner en formulaire jetterait sans le dire ce
 * qu'on n'a pas su lire, donc elle se répare là où elle a été écrite.
 */
export function activationRow(
  stored: unknown,
  options: ActivationRowOptions
): any {
  const errors = activationErrors(stored);
  const head = {
    target: options.target,
    title: options.title,
    single: options.single === true,
    bespoke: options.bespoke === true,
    owed: options.owed === true,
    resettable: options.resettable === true,
    json: JSON.stringify(stored, null, 2),
  };
  if (errors.length > 0) {
    return { ...head, invalid: true, error: errors.join(", ") };
  }

  const activation = editableActivation(stored);

  return {
    ...head,
    invalid: false,
    conditions: conditionKinds.map((kind) => ({
      value: kind,
      label: localize(`COWBOY.activation.conditions.${kind}`),
      checked: activation.conditions.some((condition) => condition.kind === kind),
    })),
    conditioned: activation.conditions.length > 0,
    paymentOptions: activation.paymentOptions.map((payments, optionIndex) => ({
      index: optionIndex,
      // « ou » sépare deux options, il n'ouvre pas la première.
      separated: optionIndex > 0,
      payments: payments.map((payment, paymentIndex) => ({
        ...payment,
        index: paymentIndex,
        options: chosen(labelled(paymentResources, "COWBOY.riffs.payments"), payment.resource),
      })),
    })),
    effects: options.bespoke
      ? []
      : activation.effects.map((effect, effectIndex) => ({
          index: effectIndex,
          amount: isQuantified(effect.kind) ? (effect as any).amount : undefined,
          quantified: isQuantified(effect.kind),
          kinds: chosen(labelled(effectKinds, "COWBOY.riffs.effects"), effect.kind),
          targets: effect.kind === "forbid"
            ? chosen(labelled(prohibitions, "COWBOY.activation.prohibitions"), effect.target)
            : undefined,
          operations: effect.kind === "transformResult"
            ? chosen(labelled(resultTransformations, "COWBOY.activation.transformations"), effect.operation)
            : undefined,
        })),
    // Une activation instantanée n'a pas de portée : l'absence est un choix du
    // menu, pas une case à cocher de plus.
    scopes: options.instantOnly
      ? undefined
      : chosen(
          [
            { value: "", label: localize("COWBOY.activation.instant") },
            ...labelled(activationScopes, "COWBOY.activation.scopes"),
          ],
          activation.scope ?? ""
        ),
    persistent: activation.scope !== undefined,
    untilSecret: activation.untilSecret === true,
    secret: activation.secret === true,
  };
}

// ========================================
// Les gestes, indépendants du porteur
// ========================================
//
// Chacun prend l'activation relue et rend celle qu'il faut écrire. Où elle est
// rangée ne les regarde pas : c'est ce qui permet aux deux fiches de partager
// non seulement le formulaire, mais les vingt gestes qui le font vivre.

export type ActivationChange = (activation: Activation) => Activation;

/** Les conditions sont conjointes : les trois cases se relisent en entier. */
export const toggleCondition = (kind: string, checked: boolean): ActivationChange =>
  (activation) => ({
    ...activation,
    conditions: conditionKinds
      .filter((candidate) =>
        candidate === kind
          ? checked
          : activation.conditions.some((condition) => condition.kind === candidate)
      )
      .map((candidate) => ({ kind: candidate })),
  });

const mapOptions = (
  activation: Activation,
  change: (options: Activation["paymentOptions"]) => Activation["paymentOptions"]
): Activation => ({ ...activation, paymentOptions: change(activation.paymentOptions) });

const mapPayments = (
  activation: Activation,
  optionIndex: number,
  change: (payments: Activation["paymentOptions"][number]) => Activation["paymentOptions"][number]
): Activation =>
  mapOptions(activation, (options) =>
    options.map((payments, index) => (index === optionIndex ? change(payments) : payments))
  );

/**
 * Une option vide serait gratuite, ce qui rendrait toutes les autres inutiles :
 * la nouvelle alternative naît avec un prix.
 */
export const addOption = (): ActivationChange =>
  (activation) =>
    mapOptions(activation, (options) => [...options, [{ resource: "rythme", amount: 1 }]]);

export const removeOption = (optionIndex: number): ActivationChange =>
  (activation) =>
    mapOptions(activation, (options) => options.filter((_option, i) => i !== optionIndex));

export const addPayment = (optionIndex: number): ActivationChange =>
  (activation) =>
    mapPayments(activation, optionIndex, (payments) => [
      ...payments,
      { resource: "rythme", amount: 1 },
    ]);

export const removePayment = (optionIndex: number, paymentIndex: number): ActivationChange =>
  (activation) =>
    mapPayments(activation, optionIndex, (payments) =>
      payments.filter((_payment, i) => i !== paymentIndex)
    );

export const changePayment = (
  optionIndex: number,
  paymentIndex: number,
  change: Partial<Activation["paymentOptions"][number][number]>
): ActivationChange =>
  (activation) =>
    mapPayments(activation, optionIndex, (payments) =>
      payments.map((payment, i) => (i === paymentIndex ? { ...payment, ...change } : payment))
    );

const mapEffects = (
  activation: Activation,
  change: (effects: Effect[]) => Effect[]
): Activation => ({ ...activation, effects: change(activation.effects) });

export const addEffect = (): ActivationChange =>
  (activation) => mapEffects(activation, (effects) => [...effects, { kind: "dice", amount: 1 }]);

export const removeEffect = (effectIndex: number): ActivationChange =>
  (activation) =>
    mapEffects(activation, (effects) => effects.filter((_effect, i) => i !== effectIndex));

const atEffect = (effectIndex: number, change: (effect: Effect) => Effect): ActivationChange =>
  (activation) =>
    mapEffects(activation, (effects) =>
      effects.map((effect, i) => (i === effectIndex ? change(effect) : effect))
    );

/**
 * Changer la nature d'un effet change ce qu'il porte. Le montant survit d'un
 * effet quantifié à un autre - passer des dés aux cartons garde le « -1 » - et
 * disparaît partout ailleurs.
 */
export const changeEffectKind = (effectIndex: number, kind: EffectKind): ActivationChange =>
  atEffect(effectIndex, (previous) => {
    const next = defaultEffect(kind);
    return "amount" in next && "amount" in previous
      ? { ...next, amount: previous.amount }
      : next;
  });

export const changeEffectAmount = (effectIndex: number, amount: number): ActivationChange =>
  atEffect(effectIndex, (effect) => ("amount" in effect ? { ...effect, amount } : effect));

export const changeEffectTarget = (effectIndex: number, target: string): ActivationChange =>
  atEffect(effectIndex, (effect) =>
    effect.kind === "forbid" ? { ...effect, target: target as any } : effect
  );

export const changeEffectOperation = (effectIndex: number, operation: string): ActivationChange =>
  atEffect(effectIndex, (effect) =>
    effect.kind === "transformResult" ? { ...effect, operation: operation as any } : effect
  );

/**
 * Passer une activation à instantanée emporte ses deux drapeaux : ils ne
 * veulent rien dire sans portée, et `activationErrors` les refuse.
 */
export const changeScope = (scope: string): ActivationChange =>
  (activation) => {
    const { scope: _previous, untilSecret, secret, ...rest } = activation;
    if (!scope) return rest;

    return {
      ...rest,
      scope: scope as ActivationScope,
      ...(untilSecret ? { untilSecret: true } : {}),
      ...(secret ? { secret: true } : {}),
    };
  };

export const changeFlag = (
  flag: "untilSecret" | "secret",
  checked: boolean
): ActivationChange =>
  (activation) => {
    const next = { ...activation };
    if (checked) next[flag] = true;
    else delete next[flag];

    return next;
  };

/**
 * Branche le formulaire d'activation sur celui qui sait où ranger le résultat.
 *
 * `apply` reçoit la cible telle que le gabarit la portait et le geste à
 * appliquer ; `replace` reçoit une activation écrite à la main dans
 * l'échappatoire, et la range telle quelle - donc bloquée si elle est illisible.
 */
export function wireActivationEditor(
  html: JQuery,
  apply: (target: string, change: ActivationChange) => void,
  replace: (target: string, value: unknown) => void
): void {
  const numberOf = (element: HTMLElement, key: string) =>
    Number.parseInt(element.dataset[key] ?? "-1");

  const on = (
    selector: string,
    event: "click" | "change",
    act: (target: string, element: HTMLElement) => void
  ) =>
    html.find(selector).on(event, (domEvent) => {
      const element = domEvent.currentTarget as HTMLElement;
      const target = element.dataset.target;
      if (target === undefined) return;
      if (event === "click") domEvent.preventDefault();

      act(target, element);
    });

  on(".cowboy-activation-json", "change", (target, element) => {
    let value: unknown = (element as HTMLTextAreaElement).value;
    try {
      value = JSON.parse((element as HTMLTextAreaElement).value);
    } catch {
      /* conservé, donc bloqué */
    }
    replace(target, value);
  });

  on(".cowboy-activation-condition", "change", (target, element) => {
    const box = element as HTMLInputElement;
    apply(target, toggleCondition(box.value, box.checked));
  });

  on(".cowboy-activation-option-add", "click", (target) => apply(target, addOption()));

  on(".cowboy-activation-option-remove", "click", (target, element) =>
    apply(target, removeOption(numberOf(element, "option")))
  );

  on(".cowboy-activation-payment-add", "click", (target, element) =>
    apply(target, addPayment(numberOf(element, "option")))
  );

  on(".cowboy-activation-payment-remove", "click", (target, element) =>
    apply(target, removePayment(numberOf(element, "option"), numberOf(element, "payment")))
  );

  on(".cowboy-activation-payment-resource", "change", (target, element) =>
    apply(
      target,
      changePayment(numberOf(element, "option"), numberOf(element, "payment"), {
        resource: (element as HTMLSelectElement).value as any,
      })
    )
  );

  on(".cowboy-activation-payment-amount", "change", (target, element) =>
    apply(
      target,
      changePayment(numberOf(element, "option"), numberOf(element, "payment"), {
        amount: Number.parseInt((element as HTMLInputElement).value),
      })
    )
  );

  on(".cowboy-activation-effect-add", "click", (target) => apply(target, addEffect()));

  on(".cowboy-activation-effect-remove", "click", (target, element) =>
    apply(target, removeEffect(numberOf(element, "effect")))
  );

  on(".cowboy-activation-effect-kind", "change", (target, element) =>
    apply(
      target,
      changeEffectKind(
        numberOf(element, "effect"),
        (element as HTMLSelectElement).value as EffectKind
      )
    )
  );

  on(".cowboy-activation-effect-amount", "change", (target, element) =>
    apply(
      target,
      changeEffectAmount(
        numberOf(element, "effect"),
        Number.parseInt((element as HTMLInputElement).value)
      )
    )
  );

  on(".cowboy-activation-effect-target", "change", (target, element) =>
    apply(
      target,
      changeEffectTarget(numberOf(element, "effect"), (element as HTMLSelectElement).value)
    )
  );

  on(".cowboy-activation-effect-operation", "change", (target, element) =>
    apply(
      target,
      changeEffectOperation(numberOf(element, "effect"), (element as HTMLSelectElement).value)
    )
  );

  on(".cowboy-activation-scope", "change", (target, element) =>
    apply(target, changeScope((element as HTMLSelectElement).value))
  );

  on(".cowboy-activation-until-secret", "change", (target, element) =>
    apply(target, changeFlag("untilSecret", (element as HTMLInputElement).checked))
  );

  on(".cowboy-activation-secret", "change", (target, element) =>
    apply(target, changeFlag("secret", (element as HTMLInputElement).checked))
  );
}
