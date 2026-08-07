import { genres, grooveItem, moduleId } from "./constants";
import {
  activeEffects,
  isActivationValid,
  normalizeActivation,
  survives as activationSurvives,
} from "./rolls/activationTerms";
import {
  grooveAudiences,
  normalizeGroove,
  openedApproaches,
  reminderAudiences,
} from "./rolls/grooveTerms";
import {
  ActivationChange,
  activationRow,
  chosen,
  editableActivation,
  emptyActivation,
  labelled,
  wireActivationEditor,
} from "./activationEditor";
import { confirmPlayOption, payOption, paymentOptionBlocked, paymentOptionLabel } from "./riffPlay";
import { getActivePrime } from "./prime";
import {
  ActiveActivation,
  SourcedActivation,
  Groove,
  GrooveAudience,
  GrooveReminder,
  ReminderAudience,
  Substitution,
  BespokeGrooveRules,
} from "./types";
import { BESPOKE_GROOVES } from "./rolls/bespokeGrooves";
import type { ActivationEvent } from "./rolls/activationTerms";

// Qui porte quel groove, et ce qu'il ouvre.
//
// Jumeau de `riffs.ts`, à ceci près qu'il n'y a rien à lire sur la prime : un
// groove n'appartient pas à la partie mais au personnage, et il ne change qu'au
// pivot de saison. C'est exactement ce qu'un Item possédé est chez Foundry, et
// c'est pourquoi ce module n'a pas d'équivalent de `riffSelection` (ADR 0010).
//
// Ce module lit et écrit ; tout ce qui se calcule vit dans
// `rolls/grooveTerms.ts` et `rolls/activationTerms.ts`, qui ne connaissent pas
// Foundry.
//
// Un groove porte trois choses : ses Activations, sa Substitution, ses Rappels
// (ADR 0013).

const localize = (key: string): string =>
  (game as any)?.i18n?.localize(key) ?? key;

const escapeHtml = (value: unknown): string =>
  (foundry as any).utils.escapeHTML(String(value ?? ""));

/**
 * Le groove que porte cet acteur, ou rien.
 *
 * Le premier et non « le seul » : la fiche impose un groove unique en
 * remplaçant, mais un monde importé à la main peut en porter deux, et une aide
 * de jeu qui refuserait de s'afficher dans ce cas ne rendrait service à
 * personne.
 */
export function grooveItemOf(actor: any): any | undefined {
  return actor?.items?.find?.((item: any) => item.type === grooveItem);
}

/** L'identifiant stable du groove embarqué, ou une chaîne vide. */
export function grooveIdOf(actor: any): string {
  const item = grooveItemOf(actor);
  return catalogIdOf(item);
}

/**
 * L'identité de catalogue d'un Groove, celle sur laquelle les exceptions
 * nommées se reconnaissent. Un groove maison n'en a pas et retombe sur son
 * propre identifiant, ce qui ne correspondra à aucune exception.
 */
function catalogIdOf(item: any): string {
  return String(item?.getFlag?.(moduleId, "catalogId") ?? item?.id ?? item?._id ?? "");
}

/**
 * Les exceptions nommées que cette prime impose aux nouveaux Tests.
 *
 * L'état manuel ne suffit jamais : retirer le groove rend immédiatement ses
 * champs inertes, même avant que le nettoyage de la fiche ait fini de courir.
 */
export function bespokeRulesOf(prime: any): BespokeGrooveRules {
  const id = grooveIdOf(prime);
  const state = prime?.system?.grooveState ?? {};

  if (id === BESPOKE_GROOVES.orbital) {
    return { orbitalSafe: state.orbitalSafe === true };
  }
  if (id === BESPOKE_GROOVES.dangerousGoods) {
    return { dangerousGoods: true };
  }
  if (id === BESPOKE_GROOVES.smallerBites) {
    return { smallerBites: true };
  }
  if (id === BESPOKE_GROOVES.masterKey) {
    return { masterKey: true };
  }
  if (id === BESPOKE_GROOVES.vengeance) {
    return { vengeanceHunterId: String(state.vengeanceHunterId ?? "") };
  }
  if (id === BESPOKE_GROOVES.shadows) {
    return {
      shadowsHunterIds: Array.isArray(state.shadowsHunterIds)
        ? state.shadowsHunterIds.map(String).filter(Boolean).slice(0, 2)
        : [],
      shadowsAccepted: state.shadowsAccepted === true,
    };
  }

  return {};
}

export function hasLongTermPlan(actor: any): boolean {
  return grooveIdOf(actor) === BESPOKE_GROOVES.longTermPlan;
}

export const emptyBespokeGrooveState = () => ({
  orbitalSafe: false,
  vengeanceHunterId: "",
  shadowsHunterIds: [],
  shadowsAccepted: false,
});

/** Ce que ce groove porte, normalisé. Un acteur sans groove n'ouvre rien. */
export function grooveOf(actor: any): Groove | undefined {
  const item = grooveItemOf(actor);
  return item ? normalizeGroove(item.system) : undefined;
}

/** Les Activations instantanées que cet acteur porte, appliquées d'office. */
export function grooveActivationsOf(actor: any): SourcedActivation[] {
  const item = grooveItemOf(actor);
  const raw = item?.system?.activations;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isActivationValid)
    .map(normalizeActivation)
    .filter((activation) => !activation.scope)
    .map((activation) => ({ ...activation, source: item?.name }));
}

export function grooveTermsOf(item: any): Groove {
  return normalizeGroove(item?.system);
}

/** Le public que cet acteur accepte, ou rien si ce type n'en porte pas. */
function audienceOfActor(actor: any): GrooveAudience | undefined {
  if (actor?.type === "chasseur") return "chasseur";
  if (actor?.type === "prime") return "prime";

  return undefined;
}

/**
 * Dépose un groove sur une fiche, en remplaçant celui qui s'y trouvait.
 *
 * Un acteur porte exactement un groove : le livre n'en donne qu'un et n'en fait
 * changer qu'au pivot de saison. Le remplacement est confirmé, comme réappliquer
 * un type de session sur une prime déjà garnie - et pour la même raison, c'est
 * une écriture qu'on ne peut pas défaire d'un clic.
 *
 * Rend le groove posé, ou `false` si rien n'a été écrit.
 */
export async function dropGroove(actor: any, item: any): Promise<any> {
  if (item?.type !== grooveItem) return false;

  const wanted = audienceOfActor(actor);
  if (!wanted) return false;

  // Un groove de prime posé sur un chasseur ne veut rien dire, et le silence
  // laisserait croire que le dépôt a marché.
  const groove = grooveTermsOf(item);
  if (groove.audience !== wanted) {
    ui.notifications?.warn(
      (game as any).i18n.format("COWBOY.groove.wrongAudience", {
        name: item.name,
        audience: localize(`COWBOY.groove.audiences.${groove.audience}`),
      })
    );
    return false;
  }

  const current = grooveItemOf(actor);
  if (current) {
    const { DialogV2 } = (foundry as any).applications.api;
    const confirmed = await DialogV2.confirm({
      window: { title: localize("COWBOY.groove.replaceTitle") },
      content: `<p>${escapeHtml(
        (game as any).i18n.format("COWBOY.groove.replace", {
          current: current.name,
          next: item.name,
        })
      )}</p>`,
    });
    if (!confirmed) return false;
  }

  // Le groove vient souvent d'un compendium : `toObject()` en prend une copie,
  // et l'original n'est jamais relié. Un groove corrigé dans le compendium ne
  // remonte donc pas dans les personnages - même règle que le type de session
  // (ADR 0003), et pour la même raison : ce qui amorce se copie.
  const source = item.toObject();
  source.flags = {
    ...(source.flags ?? {}),
    [moduleId]: {
      ...(source.flags?.[moduleId] ?? {}),
      // Foundry peut régénérer l'id d'un Item embarqué. Les exceptions nommées
      // reconnaissent le catalogue, pas cet id local, donc elles gardent la
      // provenance explicitement.
      catalogId: String(item.getFlag?.(moduleId, "catalogId") ?? item.id ?? item._id ?? ""),
    },
  };
  const [created] = await actor.createEmbeddedDocuments("Item", [source]);

  // La suppression vient après la création : si la seconde échoue, le
  // personnage garde son groove plutôt que de se retrouver sans aucun.
  if (current) {
    await actor.deleteEmbeddedDocuments("Item", [current.id]);
  }

  if (actor.type === "prime") {
    await actor.update({ "system.grooveState": emptyBespokeGrooveState() });
  }

  ui.notifications?.info(
    (game as any).i18n.format("COWBOY.groove.dropped", { name: item.name })
  );

  return created;
}

export async function removeGroove(actor: any): Promise<void> {
  const current = grooveItemOf(actor);
  if (!current) return;

  await actor.deleteEmbeddedDocuments("Item", [current.id]);
  if (actor.type === "prime") {
    await actor.update({ "system.grooveState": emptyBespokeGrooveState() });
  }
}

/**
 * Les approches qu'un test ouvre en plus de la sienne.
 *
 * Deux substitutions au plus : celle du lanceur, et celle qu'un Jam ! lui prête.
 * Le groove prêté agit sur le **matériel du lanceur** - c'est la règle qui
 * passe, pas les traits (ADR 0010).
 */
export function substitutedApproaches(
  actor: any,
  category: string,
  lent?: Substitution
): string[] {
  return openedApproaches([grooveOf(actor)?.substitution, lent], category);
}

/**
 * Ce que le système fait de ce groove, déduit et non saisi.
 *
 * La phrase de statut vivait dans les descriptions, en français et en anglais,
 * sans rien pour les tenir d'accord : cinq grooves finissaient annoncés
 * « Reminder only » côté anglais alors que le moteur les appliquait. Elle se
 * calcule désormais de trois faits.
 *
 * L'appartenance aux exceptions nommées en fait partie, et elle est
 * indispensable : celles-ci portent `activations: []` tout en étant jouées par
 * du code nommé, si bien qu'Enlèvement orbital dériverait sans elle en « rappel
 * seulement » (ADR 0014, ADR 0015).
 */
export type GroovePlayStatus = "played" | "partial" | "reminder";

export function groovePlayStatus(groove: Groove, grooveId: string): GroovePlayStatus {
  const applied =
    groove.activations.length > 0 ||
    Boolean(groove.substitution?.from) ||
    (Object.values(BESPOKE_GROOVES) as string[]).includes(grooveId);

  if (!applied) return "reminder";
  return groove.reminders.length > 0 ? "partial" : "played";
}

/** Ce qu'une fiche ou une boîte affiche d'un groove : son nom et son texte. */
export function grooveCard(
  actor: any
): { id: string; name: string; description: string; audience: GrooveAudience; status: GroovePlayStatus } | undefined {
  const item = grooveItemOf(actor);
  if (!item) return undefined;

  const groove = grooveTermsOf(item);
  const visibleReminders = groove.reminders.filter((reminder) =>
    reminder.audience === "table" || (game as any)?.user?.isGM === true
  );
  const status = groovePlayStatus(groove, String(item._id ?? ""));

  return {
    id: catalogIdOf(item),
    name: item.name,
    description: [
      localizeStatus(status),
      groove.description,
      ...visibleReminders.map((reminder) => reminder.text),
    ].filter(Boolean).join("\n\n"),
    audience: groove.audience,
    status,
  };
}

const localizeStatus = (status: GroovePlayStatus): string =>
  (game as any)?.i18n?.localize(`COWBOY.groove.status.${status}`) ?? "";

// ========================================
// Les activations en cours
// ========================================

/**
 * Les Activations persistantes qui courent sur cette prime.
 *
 * Chacune est gelée avec le nom et le texte du Groove qui l'a posée : modifier
 * le Groove ensuite ne réécrit pas ce qui court déjà (ADR 0012).
 */
export function activeActivations(prime: any): ActiveActivation[] {
  const stored = Array.isArray(prime?.system?.activations)
    ? prime.system.activations
    : [];
  return stored.filter(isActivationValid).map((entry: any, index: number) => ({
    ...normalizeActivation(entry),
    grooveId: String(entry?.grooveId ?? `orphan:${index}`),
    name: String(entry?.name ?? localize("COWBOY.groove.title")),
    description: String(entry?.description ?? ""),
  }));
}

export function activationsFor(
  prime: any,
  category: string,
  genre: string,
  advantage: -1 | 0 | 1 = 0
): ActiveActivation[] {
  return activeActivations(prime).filter((activation) =>
    isActivationValid(activation) &&
    activeEffects([activation], { category, genre, advantage }).length > 0
  );
}

/**
 * Ce que les fiches et la boîte rappellent, sans réinterpréter les effets.
 *
 * Une Activation en cours est nommée partout où elle agit : c'est ce que
 * l'ADR 0010 réclamait, et ce qui tient lieu de journal (ADR 0012).
 */
export function activationCards(prime: any) {
  return activeActivations(prime).map((activation) => ({
    ...activation,
    scopeLabel: activation.scope
      ? localize(`COWBOY.activation.scopes.${activation.scope}`)
      : localize("COWBOY.activation.instant"),
    conditionLabel: activation.conditions
      .map((condition) => localize(`COWBOY.activation.conditions.${condition.kind}`))
      .join(" · "),
  }));
}

/** Le bouton du groove de prime, avec chaque prix possible et sa garde. */
export function groovePlayOffer(prime: any) {
  // Les paiements en risque appartiennent à la prime en jeu. Une fiche préparée
  // en marge peut montrer son groove, mais pas le jouer sur une autre chasse.
  if (!prime?.id || getActivePrime()?.id !== prime.id) return undefined;

  const item = grooveItemOf(prime);
  if (!item) return undefined;
  const rawActivations = item.system?.activations;
  if (Array.isArray(rawActivations) && rawActivations.some((entry: unknown) => !isActivationValid(entry))) {
    return undefined;
  }

  const groove = grooveTermsOf(item);
  const persistent = groove.activations.filter((activation) => activation.scope);
  if (groove.audience !== "prime" || persistent.length === 0) {
    return undefined;
  }

  const alreadyRunning = activeActivations(prime).some(
    (activation) => activation.grooveId === item.id
  );
  const noEffect = alreadyRunning
    ? localize("COWBOY.riffs.noEffect")
    : undefined;
  const options = persistent.find((activation) => activation.paymentOptions.length > 0)
    ?.paymentOptions ?? [[]];

  const choices = options.map((payments, index) => ({
    ...(payments[0] ?? { resource: "risque" as const, amount: 0 }),
    payments,
    index,
    label: paymentOptionLabel(payments),
    blocked: noEffect ?? paymentOptionBlocked(payments, prime),
  }));

  return {
    name: item.name,
    description: groove.description,
    reminders: groove.reminders.map((reminder, index) => ({ ...reminder, index })),
    choices,
    stuck: choices.every((choice) => choice.blocked !== undefined),
  };
}

/** Joue le groove de cette prime et pose toutes ses activations d'un coup. */
export async function playGroove(prime: any, choiceIndex: number): Promise<void> {
  const item = grooveItemOf(prime);
  const offer = groovePlayOffer(prime);
  if (!item || !offer) return;

  const choice = offer.choices[choiceIndex];
  if (!choice || choice.blocked) return;

  const payments = choice.payments ?? [];
  if (!(await confirmPlayOption(item.name, payments))) return;

  // Le dialogue a laissé le temps à un autre clic de poser l'activation.
  if (groovePlayOffer(prime)?.choices[choiceIndex]?.blocked) return;
  if (!(await payOption(payments, prime))) return;

  const groove = grooveTermsOf(item);
  const active = activeActivations(prime);
  await prime.update({
    "system.activations": [
      ...active,
      ...groove.activations.filter((activation) => activation.scope).map((activation) => ({
        ...activation,
        grooveId: item.id,
        name: item.name,
        description: groove.description,
      })),
    ],
  });

  for (const reminder of groove.reminders) {
    const message: any = {
      speaker: ChatMessage.getSpeaker({ actor: prime }),
      content: `<p><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(reminder.text)}</p>`,
    };
    if (reminder.audience === "bigshot") {
      message.whisper = ((game as any).users ?? [])
        .filter((user: any) => user.isGM)
        .map((user: any) => user.id);
    }
    await ChatMessage.create(message);
  }
}

/** Éteint les activations en cours arrivées au bout de leur horloge. */
export async function expireActivations(
  prime: any,
  event: ActivationEvent,
  usedGrooveIds?: string[]
): Promise<void> {
  // Une activation invalide est conservée pour réparation : elle ne court pas,
  // donc rien ne l'éteint, mais la réécriture ne doit pas l'effacer non plus.
  const invalid = (Array.isArray(prime?.system?.activations)
    ? prime.system.activations
    : []).filter((entry: unknown) => !isActivationValid(entry));
  const before = activeActivations(prime);
  const used = usedGrooveIds ? new Set(usedGrooveIds) : undefined;
  const candidates = event === "test" && used
    ? before.filter((activation) => used.has(activation.grooveId))
    : before;
  const survivors = candidates.filter((activation) => activationSurvives(activation, event));
  const survivorSet = new Set(survivors);
  const after = before.filter(
    (activation) => !candidates.includes(activation) || survivorSet.has(activation)
  );

  if (after.length === before.length) return;
  await prime.update({ "system.activations": [...invalid, ...after] });
}

// ========================================
// L'éditeur
// ========================================
//
// Trois sections, une par chose que le groove porte : ses Activations, sa
// Substitution, ses Rappels (ADR 0013). Le prix et les effets vivent dans les
// Activations et nulle part ailleurs.
//
// Le formulaire d'une Activation est celui des riffs, tel quel : c'est la même
// mécanique, elle n'est éditée qu'une fois (ADR 0012). Ce module ne fournit que
// la cible - le rang de l'activation dans la liste du groove - et l'écriture.

/**
 * Le groove tel que sa feuille le dessine : trois sections, une par chose qu'il
 * porte.
 *
 * Chaque menu porte sa sélection déjà résolue : le gabarit n'a alors ni
 * comparaison ni appartenance à calculer, et aucun helper à inventer pour ça.
 */
export function grooveEditor(item: any): any {
  const groove = grooveTermsOf(item);

  return {
    // L'éditeur doit lire le stockage brut : une activation vide ou invalide
    // reste visible afin d'être complétée ou réparée (ADR 0012).
    //
    // La cible d'un groove est le rang de son activation, tel quel : la liste
    // vit sur l'item et rien d'autre n'est nécessaire pour y revenir.
    activations: storedActivations(item).map((activation, index) =>
      activationRow(activation, {
        target: String(index),
        title: `${localize("COWBOY.activation.one")} ${index + 1}`,
      })
    ),
    audience: grooveAudiences.map((audience) => ({
      value: audience,
      label: localize(`COWBOY.groove.audiences.${audience}`),
      selected: audience === groove.audience,
    })),
    description: groove.description,

    // Une substitution absente se dessine quand même : son menu ouvert sur
    // « aucune » est ce qui apprend à une table qu'elle existe.
    substitution: {
      none: !groove.substitution,
      from: genres.map((genre) => ({
        value: genre,
        selected: genre === groove.substitution?.from,
      })),
      to: genres.map((genre) => ({
        value: genre,
        checked: groove.substitution?.to.includes(genre) === true,
        // Prêter une approche à elle-même n'ouvre rien : la case est fermée
        // plutôt que silencieusement jetée à la lecture.
        disabled: genre === groove.substitution?.from,
      })),
    },

    // Ce que le système dit sans jamais l'appliquer. Le public par défaut suit
    // celui du groove — privé pour une prime, public pour un chasseur — mais
    // chaque rappel le tranche pour lui-même, donc il se règle ligne par ligne.
    reminders: groove.reminders.map((reminder, index) => ({
      ...reminder,
      index,
      audiences: chosen(
        labelled(reminderAudiences, "COWBOY.groove.reminderAudiences"),
        reminder.audience
      ),
    })),
  };
}

// ========================================
// Écritures
// ========================================

/**
 * Les activations telles qu'elles sont **stockées**, invalides comprises.
 *
 * L'éditeur lit le brut : une activation qu'on vient d'ajouter n'a encore ni
 * prix ni effet, et une lecture qui la jetterait ferait paraître le bouton
 * inerte.
 */
function storedActivations(item: any): unknown[] {
  return Array.isArray(item?.system?.activations)
    ? [...item.system.activations]
    : [];
}

export async function addActivation(item: any): Promise<void> {
  // Instantanée, sans condition et gratuite : le cas le plus courant du livre,
  // et celui qu'on relit le plus vite quand on a oublié de régler la ligne
  // qu'on vient d'ajouter.
  await item.update({
    "system.activations": [...storedActivations(item), emptyActivation()],
  });
}

export async function removeActivation(item: any, index: number): Promise<void> {
  await item.update({
    "system.activations": storedActivations(item).filter((_entry, i) => i !== index),
  });
}

/** Ce que l'échappatoire écrit : tel quel, donc bloqué si c'est illisible. */
export async function writeActivation(
  item: any,
  index: number,
  value: unknown
): Promise<void> {
  const activations = storedActivations(item);
  if (index < 0 || index >= activations.length) return;

  activations[index] = value;
  await item.update({ "system.activations": activations });
}

/**
 * Réécrit une activation entière pour un seul geste.
 *
 * Le formulaire n'écrit que ce qu'il sait dessiner : une activation qu'il a
 * relue est réécrite dans la forme de l'ADR 0012, sans les clefs des anciennes
 * (`rules`, `filter`, `payments`) qu'un groove d'avant pourrait traîner.
 */
async function changeActivation(
  item: any,
  index: number,
  change: ActivationChange
): Promise<void> {
  const activations = storedActivations(item);
  if (index < 0 || index >= activations.length) return;

  activations[index] = change(editableActivation(activations[index]));
  await item.update({ "system.activations": activations });
}

export async function setAudience(
  item: any,
  audience: GrooveAudience
): Promise<void> {
  await item.update({
    "system.audience": grooveAudiences.includes(audience) ? audience : "chasseur",
  });
}

export async function setDescription(
  item: any,
  description: string
): Promise<void> {
  await item.update({ "system.description": description });
}

/**
 * Règle la substitution.
 *
 * Source et cibles s'écrivent ensemble : passer la source à « aucune » sans
 * vider les cibles laisserait un réglage invisible qui ressortirait au prochain
 * choix de source.
 */
export async function setSubstitution(
  item: any,
  from: string,
  to: string[]
): Promise<void> {
  await item.update({
    "system.substitution": from
      ? { from, to: to.filter((approach) => approach !== from) }
      : { from: "", to: [] },
  });
}

// ----------------------------------------
// Les rappels
// ----------------------------------------

/** Les rappels tels qu'ils sont **stockés**, lignes vides comprises. */
function storedReminders(item: any): GrooveReminder[] {
  const stored = item?.system?.reminders;
  if (!Array.isArray(stored)) return [];

  return stored.map((reminder: any) => ({
    text: String(reminder?.text ?? ""),
    audience: (reminder?.audience === "table" ? "table" : "bigshot") as ReminderAudience,
  }));
}

async function updateReminders(
  item: any,
  change: (reminders: GrooveReminder[]) => GrooveReminder[]
): Promise<void> {
  await item.update({ "system.reminders": change(storedReminders(item)) });
}

export async function addReminder(item: any): Promise<void> {
  await updateReminders(item, (reminders) => [
    ...reminders,
    // Big Shot par défaut : un rappel qu'on vient d'écrire n'a pas encore été
    // relu, et le rendre public d'office est ce qui ne se rattrape pas.
    { text: "", audience: "bigshot" },
  ]);
}

export async function removeReminder(item: any, index: number): Promise<void> {
  await updateReminders(item, (reminders) =>
    reminders.filter((_reminder, i) => i !== index)
  );
}

export async function updateReminder(
  item: any,
  index: number,
  change: Partial<GrooveReminder>
): Promise<void> {
  await updateReminders(item, (reminders) =>
    reminders.map((reminder, i) =>
      i === index ? { ...reminder, ...change } : reminder
    )
  );
}

/** Branche l'éditeur d'un groove : ses activations, sa substitution, ses rappels. */
export function wireGrooveEditor(html: JQuery, item: any): void {
  const indexOf = (element: HTMLElement) =>
    Number.parseInt(element.dataset.index ?? "-1");

  // ----------------------------------------
  // Les activations
  // ----------------------------------------
  //
  // Le formulaire et ses vingt gestes vivent dans `activationEditor.ts` : ce
  // module ne dit que deux choses, où l'activation est rangée et comment on
  // l'écrit. Une réécriture entière par geste, parce qu'une activation
  // s'applique tout entière ou pas du tout (ADR 0012).

  html.find(".cowboy-activation-add").on("click", (event) => {
    event.preventDefault();
    void addActivation(item);
  });

  html.find(".cowboy-activation-remove").on("click", (event) => {
    event.preventDefault();
    const target = (event.currentTarget as HTMLElement).dataset.target ?? "";
    void removeActivation(item, Number.parseInt(target));
  });

  wireActivationEditor(
    html,
    (target, change) => void changeActivation(item, Number.parseInt(target), change),
    (target, value) => void writeActivation(item, Number.parseInt(target), value)
  );

  html.find(".cowboy-groove-audience").on("change", (event) => {
    void setAudience(
      item,
      (event.currentTarget as HTMLSelectElement).value as GrooveAudience
    );
  });

  html.find(".cowboy-groove-description").on("change", (event) => {
    void setDescription(item, (event.currentTarget as HTMLTextAreaElement).value);
  });

  // La substitution se relit en entier à chaque geste : la source et les cibles
  // sont un seul réglage, et changer la source doit pouvoir écarter une cible
  // devenue égale à elle.
  const readSubstitution = () => {
    const from = String(html.find(".cowboy-groove-substitution-from").val() ?? "");
    const to = html
      .find(".cowboy-groove-substitution-to:checked")
      .toArray()
      .map((box) => (box as HTMLInputElement).value);

    return { from, to };
  };

  html
    .find(".cowboy-groove-substitution-from, .cowboy-groove-substitution-to")
    .on("change", () => {
      const { from, to } = readSubstitution();
      void setSubstitution(item, from, to);
    });

  // ----------------------------------------
  // Les rappels
  // ----------------------------------------

  html.find(".cowboy-groove-reminder-add").on("click", (event) => {
    event.preventDefault();
    void addReminder(item);
  });

  html.find(".cowboy-groove-reminder-remove").on("click", (event) => {
    event.preventDefault();
    void removeReminder(item, indexOf(event.currentTarget as HTMLElement));
  });

  html.find(".cowboy-groove-reminder-text").on("change", (event) => {
    const area = event.currentTarget as HTMLTextAreaElement;
    void updateReminder(item, indexOf(area), { text: area.value });
  });

  html.find(".cowboy-groove-reminder-audience").on("change", (event) => {
    const select = event.currentTarget as HTMLSelectElement;
    void updateReminder(item, indexOf(select), {
      audience: select.value as ReminderAudience,
    });
  });
}

