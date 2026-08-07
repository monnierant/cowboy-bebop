import {
  CORRECTION_PAYMENTS,
  mouvements,
  riffs,
  sessionTypeItem,
  sessionTypePack,
  sessionTypePackEn,
} from "./constants";
import {
  activationPhase,
  isActivationValid,
  isCounter,
  normalizeActivation,
  normalizePayments,
  paymentResources,
} from "./rolls/activationTerms";
import {
  ActivationChange,
  activationRow,
  chosen,
  editableActivation,
  emptyActivation,
  labelled,
  wireActivationEditor,
} from "./activationEditor";
import {
  CustomRiff,
  Activation,
  Payment,
  Riff,
  RiffAudience,
  RiffCard,
  RiffSelection,
} from "./types";

// Quels riffs sont sur la table, et à quel mouvement.
//
// Un riff n'appartient pas à un chasseur mais à la partie : le même personnage
// improvise dans une histoire et pas dans la suivante. C'est le type de session
// qui le dit, et la prime active - qui *est* la session en cours - en porte une
// copie (ADR 0003). Ce module lit cette copie ; il ne sait pas d'où elle vient.
//
// Une entrée par mouvement, chacune indépendante des autres : le livre veut les
// riffs cumulatifs, mais la souplesse d'écrire des types de session qu'il n'a
// pas prévus a été jugée plus précieuse. La cohérence du cumul est donc à Big
// Shot, pas au code.

const localize = (key: string): string =>
  (game as any)?.i18n?.localize(key) ?? key;

export function riffName(id: string): string {
  return localize(`COWBOY.riffs.catalog.${id}.name`);
}

export function riffDescription(id: string): string {
  return localize(`COWBOY.riffs.catalog.${id}.description`);
}

/** Le riff du livre qui porte cet identifiant, s'il en existe un. */
export function bookRiff(id: string): Riff | undefined {
  return riffs.find((riff) => riff.id === id);
}

/** Une entrée vide : ce qu'un mouvement vaut quand rien n'y a été écrit. */
function emptyRiffSelection(): RiffSelection {
  return { selected: [], custom: [] };
}

/**
 * Ce qu'un porteur - prime ou type de session - ouvre à un mouvement.
 *
 * Un porteur jamais configuré n'a pas de champ `riffs` du tout, et n'ouvre donc
 * rien : la fiche le dit plutôt que d'inventer une liste par défaut.
 */
export function riffSelection(holder: any, mouvement: number): RiffSelection {
  const stored = holder?.system?.riffs?.[mouvement];
  if (!stored) return emptyRiffSelection();

  return {
    selected: Array.isArray(stored.selected) ? [...stored.selected] : [],
    custom: (Array.isArray(stored.custom) ? stored.custom : []).map(
      (riff: Partial<CustomRiff>) => ({
        name: riff?.name ?? "",
        description: riff?.description ?? "",
        // Les riffs libres écrits avant que Big Shot ait les siens sont ceux
        // des chasseurs : c'est le seul public qui existait alors.
        audience: riff?.audience === "bigshot" ? "bigshot" : "hunter",
        // Relue brute : une activation vide ou invalide reste visible afin
        // d'être complétée ou réparée dans l'éditeur (ADR 0012).
        activation: riff?.activation,
      })
    ),
    // Absent chez un porteur qui n'a rien retouché. C'est cette absence qui
    // remplace une migration : elle se lit comme « le prix du livre ».
    activations: stored.activations ?? undefined,
    correction: Array.isArray(stored.correction)
      ? normalizePayments(stored.correction)
      : undefined,
  };
}

/**
 * Ce qu'un riff du livre coûte et fait *ici*, à ce mouvement de cette session.
 *
 * Le catalogue donne le prix du livre ; le type de session peut l'avoir
 * retouché. Une entrée absente n'est pas un riff gratuit, c'est un riff qu'on
 * n'a pas retouché - la distinction est tout l'intérêt du stockage additif.
 */
export function riffActivationOf(
  holder: any,
  mouvement: number,
  id: string
): Activation {
  const stored = riffSelection(holder, mouvement).activations?.[id];
  if (stored) return normalizeActivation(stored);

  const book = bookRiff(id);
  return book?.activation ? normalizeActivation(book.activation) : emptyActivation();
}

/**
 * Ce qu'une correction coûte à ce mouvement.
 *
 * Corriger n'est pas un riff mais une règle de base, et c'est pourtant la
 * première chose qu'une session filler déplace vers le rythme (ADR 0008). Aucun
 * des huit riffs ne pouvait porter ce réglage, donc il vit à côté d'eux.
 */
export function correctionPayments(holder: any, mouvement: number): Payment[] {
  return (
    riffSelection(holder, mouvement).correction ?? [...CORRECTION_PAYMENTS]
  );
}

/** Les trois entrées, matérialisées - ce qu'une écriture doit envoyer. */
export function allRiffSelections(holder: any): RiffSelection[] {
  return mouvements.map((_mouvement, index) => riffSelection(holder, index));
}

/**
 * Les riffs d'un mouvement, prêts à être listés : ceux du livre dans l'ordre du
 * livre, puis ceux de la session. Un riff libre sans nom n'est qu'une ligne
 * commencée, et n'est montré à personne.
 */
export function riffCards(
  holder: any,
  mouvement: number,
  audience: RiffAudience
): RiffCard[] {
  const selection = riffSelection(holder, mouvement);

  const fromBook = riffs
    .filter(
      (riff) => riff.audience === audience && selection.selected.includes(riff.id)
    )
    .map((riff) => {
      const activation = riffActivationOf(holder, mouvement, riff.id);
      const storedActivation = selection.activations?.[riff.id];

      return {
        id: riff.id,
        name: riffName(riff.id),
        description: riffDescription(riff.id),
        audience: riff.audience,
        custom: false,
        paymentOptions: activation.paymentOptions,
        effects: activation.effects,
        // Un riff nommé peut porter une phase que ses effets ne disent pas :
        // Solo ! se joue hors de tout test, Quitte ou double n'a aucun effet
        // dans le vocabulaire.
        phase: activationPhase(activation, riff.phase),
        owed: riff.owed === true,
        bespoke: riff.bespoke === true,
        activation,
        activationValid: storedActivation === undefined || isActivationValid(storedActivation),
      };
    });

  // Un riff libre est mis sur la table par son nom : une ligne laissée vide
  // n'est qu'une ligne commencée, et n'est montrée à personne.
  const fromSession = selection.custom
    .filter((riff) => riff.audience === audience && riff.name.trim() !== "")
    .map((riff, index) => {
      const activation = normalizeActivation(riff.activation);

      return {
        // Un riff libre n'a pas d'identifiant stable : son public et son rang
        // en tiennent lieu, et c'est ce que le bouton renvoie. Le public en
        // fait partie parce que les rangs sont comptés par famille - sans lui,
        // le premier riff libre de Big Shot et celui des chasseurs porteraient
        // le même nom, et un joueur pourrait déclencher celui d'en face.
        id: `custom:${audience}:${index}`,
        name: riff.name,
        description: riff.description,
        audience: riff.audience,
        custom: true,
        paymentOptions: activation.paymentOptions,
        effects: activation.effects,
        phase: activationPhase(activation),
        // Personne d'autre ne paie pour un riff qu'aucun livre ne nomme, et
        // rien de nommé ne s'y cache : les deux exceptions sont du code.
        owed: false,
        bespoke: false,
        activation,
        activationValid: riff.activation === undefined || isActivationValid(riff.activation),
      };
    });

  return [...fromBook, ...fromSession];
}

/** Les riffs de ce public jouables à cette phase-ci, et pas ailleurs. */
export function riffsForPhase(
  holder: any,
  mouvement: number,
  audience: RiffAudience,
  phase: "roll" | "card" | "sheet"
): RiffCard[] {
  return riffCards(holder, mouvement, audience).filter(
    (riff) => riff.phase === phase && riff.activationValid !== false
  );
}

/**
 * La table entière, telle que Big Shot l'édite : un bloc par mouvement, chacun
 * listant tous les riffs du livre avec leur état, séparés par public, plus les
 * riffs libres de ce mouvement.
 */
export function riffEditor(holder: any, currentMouvement?: number): any[] {
  /**
   * L'activation d'une cible, prête à être dessinée par le formulaire partagé.
   *
   * La cible voyage sérialisée dans `data-target` plutôt qu'en trois champs à
   * recomposer : c'est elle que le câblage renvoie tel quel, donc une cible mal
   * formée est impossible à fabriquer depuis le gabarit.
   *
   * `single` parce qu'un riff porte exactement une activation - ce qu'il coûte
   * et ce qu'il fait *ici* - là où un groove en porte une liste.
   * `instantOnly` parce que le livre ne donne jamais d'horloge à un riff : il
   * s'applique au test qu'on joue, et seul un groove persiste.
   */
  const activationRows = (mouvementIndex: number, target: ActivationTarget, riff?: Riff) => [
    activationRow(readActivation(holder, mouvementIndex, target), {
      target: JSON.stringify({ ...target, mouvement: mouvementIndex }),
      single: true,
      instantOnly: true,
      bespoke: riff?.bespoke === true,
      owed: riff?.owed === true,
      // Un riff libre n'a pas de prix du livre : rien à lui rendre.
      resettable: target.kind === "riff",
    }),
  ];

  /** La correction n'est pas une Activation : elle ne porte qu'un prix. */
  const correctionRow = (mouvementIndex: number) => ({
    mouvement: mouvementIndex,
    payments: correctionPayments(holder, mouvementIndex).map((payment, index) => ({
      ...payment,
      index,
      // Un prix pris sur le test lui-même ne se lit sur aucune fiche : il ne
      // sait pas griser son bouton d'avance, et l'éditeur le dit.
      counter: isCounter(payment.resource),
      options: chosen(labelled(paymentResources, "COWBOY.riffs.payments"), payment.resource),
    })),
  });

  return mouvements.map((mouvement, index) => {
    const selection = riffSelection(holder, index);

    // Chaque famille reporte le mouvement et le public auxquels elle
    // appartient. C'est redondant, et c'est le but : le gabarit lit ce dont il
    // a besoin là où il est, sans remonter de contexte à coups de `../../..`,
    // qu'un bloc ajouté ou retiré suffirait à décaler en silence.
    const family = (audience: RiffAudience, title: string, icon: string) => {
      const catalog = riffs
        .filter((riff) => riff.audience === audience)
        .map((riff) => {
          const selected = selection.selected.includes(riff.id);

          return {
            id: riff.id,
            name: riffName(riff.id),
            description: riffDescription(riff.id),
            selected,
            mouvement: index,
            // Deux riffs échappent au vocabulaire et restent du code : leur
            // prix se règle, leurs effets non. L'éditeur le dit plutôt que de
            // proposer un menu qui ne serait lu par personne.
            bespoke: riff.bespoke === true,
            // Personne ici ne débite un riff dû par quelqu'un d'autre : la
            // ligne le rappelle pour que le prix ne se lise pas comme une
            // promesse (ADR 0009).
            owed: riff.owed === true,
            // L'activation n'est construite que pour un riff coché : sur onze
            // riffs, ça ferait onze formulaires qu'on n'a pas ouverts.
            activations: selected
              ? activationRows(index, { kind: "riff", id: riff.id }, riff)
              : null,
          };
        });

      return {
        audience,
        title,
        icon,
        mouvement: index,
        // Ouverts et fermés sont séparés parce qu'ils ne se lisent pas de la
        // même façon : un riff ouvert porte un prix et mérite sa ligne, un riff
        // fermé n'est qu'un nom à cocher. Les ramasser en une seule rangée rend
        // à l'éditeur la moitié de sa hauteur.
        open: catalog.filter((riff) => riff.selected),
        closed: catalog.filter((riff) => !riff.selected),
        custom: selection.custom
          .map((riff, customIndex) => ({
            ...riff,
            index: customIndex,
            mouvement: index,
            activations: activationRows(index, { kind: "custom", index: customIndex }),
          }))
          .filter((riff) => riff.audience === audience),
      };
    };

    return {
      mouvement: index,
      name: mouvement.name,
      // Celui que la table joue en ce moment, que la fiche déplie au lieu de
      // laisser Big Shot le chercher parmi trois blocs repliés. Un type de
      // session ne joue aucun mouvement : ses trois blocs restent fermés.
      current: currentMouvement === index,
      // Corriger une fausse note n'est pas un riff — ni une Activation : c'est
      // une règle de base du Test (ADR 0008). Elle a donc sa ligne, au-dessus
      // des deux familles, et un prix sans effets ni durée.
      correction: correctionRow(index),
      families: [
        family("hunter", localize("COWBOY.riffs.hunters"), "fa-guitar"),
        family("bigshot", localize("COWBOY.riffs.bigshot"), "fa-dice-d6"),
      ],
    };
  });
}

/** Tous les types de session du monde, plus ceux du pack livré. */
export async function availableSessionTypes(): Promise<
  { id: string; name: string; source: string }[]
> {
  const world = ((game as any).items ?? [])
    .filter((item: any) => item.type === sessionTypeItem)
    .map((item: any) => ({
      id: item.uuid,
      name: item.name,
      source: localize("COWBOY.sessionType.fromWorld"),
    }));

  const localizedPack = (game as any).i18n?.lang === "en"
    ? sessionTypePackEn
    : sessionTypePack;
  const pack = (game as any).packs?.get(localizedPack);
  const packed = pack
    ? (await pack.getIndex())
        .filter((entry: any) => entry.type === sessionTypeItem)
        .map((entry: any) => ({
          id: entry.uuid ?? `Compendium.${localizedPack}.${entry._id}`,
          name: entry.name,
          source: pack.metadata.label,
        }))
    : [];

  return [...world, ...packed];
}

/**
 * Ce qu'appliquer un type de session écrit sur une prime : ses trois listes,
 * copiées, et son nom en clair.
 *
 * Le lien est oublié aussitôt (ADR 0003). Le nom retenu n'est qu'indicatif - il
 * ne se resynchronise pas et survit à la suppression du document d'origine.
 */
export function sessionTypeUpdate(sessionType: any): Record<string, unknown> {
  return {
    "system.riffs": allRiffSelections(sessionType),
    "system.sessionType": sessionType?.name ?? "",
  };
}

/** Un porteur a-t-il quoi que ce soit à écraser ? */
export function hasAnyRiff(holder: any): boolean {
  return allRiffSelections(holder).some(
    (entry) => entry.selected.length > 0 || entry.custom.length > 0
  );
}

// ========================================
// Écritures
// ========================================
//
// Une prime et un type de session portent la même chose, et s'éditent donc de
// la même façon. Ces fonctions prennent le document plutôt que d'exister en
// double sur l'acteur et sur l'item.

/**
 * Réécrit la table entière pour un seul changement.
 *
 * Foundry remplace un tableau d'un bloc au lieu d'y fusionner, donc les trois
 * entrées partent ensemble - ce que fait déjà `updateSessionTrait`. Au passage,
 * un porteur qui n'avait aucun champ `riffs` en gagne un complet dès la
 * première coche.
 */
async function updateRiffs(
  holder: any,
  mouvement: number,
  change: (entry: RiffSelection) => RiffSelection
): Promise<void> {
  if (mouvement < 0 || mouvement >= mouvements.length) return;

  const all = allRiffSelections(holder);

  await holder.update({
    "system.riffs": all.map((entry, index) =>
      index === mouvement ? change(entry) : entry
    ),
  });
}

// ========================================
// Où vit une activation, et comment on l'écrit
// ========================================
//
// Un riff du livre range la sienne dans une table par identifiant ; un riff
// libre la porte à même sa ligne. Le formulaire ne connaît ni l'un ni l'autre :
// il rend une cible, et ces deux fonctions savent la relire.
//
// La correction n'en est pas une (ADR 0008) : elle a ses propres écritures,
// plus bas.

export type ActivationTarget =
  | { kind: "riff"; id: string }
  | { kind: "custom"; index: number };

/** Ce que porte cette cible en ce moment, prix du livre compris. */
function readActivation(
  holder: any,
  mouvement: number,
  target: ActivationTarget
): unknown {
  if (target.kind === "riff") {
    // Le brut d'abord, pour que l'éditeur voie une entrée invalide et puisse la
    // réparer ; le prix du livre ensuite, pour qu'un riff jamais retouché
    // s'ouvre sur ce que le livre pratique plutôt que sur une ligne vide.
    return (
      riffSelection(holder, mouvement).activations?.[target.id] ??
      bookRiff(target.id)?.activation ??
      emptyActivation()
    );
  }

  return riffSelection(holder, mouvement).custom[target.index]?.activation ?? emptyActivation();
}

/** La même entrée, cette cible réécrite. */
function writeActivation(
  entry: RiffSelection,
  target: ActivationTarget,
  activation: Activation
): RiffSelection {
  if (target.kind === "riff") {
    return {
      ...entry,
      activations: { ...(entry.activations ?? {}), [target.id]: activation },
    };
  }

  return {
    ...entry,
    custom: entry.custom.map((riff, index) =>
      index === target.index ? { ...riff, activation } : riff
    ),
  };
}

/**
 * Retouche l'activation d'une cible.
 *
 * Le prix du livre est lu *avant* d'être modifié, puis réécrit en entier : la
 * première retouche d'un riff jamais touché matérialise donc son prix du livre
 * au lieu de partir d'une liste vide. Sans ça, ajouter un second paiement à
 * S'impliquer effacerait la cartouche.
 */
export async function updateActivation(
  holder: any,
  mouvement: number,
  target: ActivationTarget,
  change: ActivationChange
): Promise<void> {
  const activation = change(editableActivation(readActivation(holder, mouvement, target)));

  await updateRiffs(holder, mouvement, (entry) =>
    writeActivation(entry, target, activation)
  );
}

/** Ce que l'échappatoire écrit : tel quel, donc bloqué si c'est illisible. */
export async function replaceActivation(
  holder: any,
  mouvement: number,
  target: ActivationTarget,
  value: unknown
): Promise<void> {
  await updateRiffs(holder, mouvement, (entry) =>
    writeActivation(entry, target, value as Activation)
  );
}

/** Rend à ce riff du livre le prix du livre, en oubliant la retouche. */
export async function resetActivation(
  holder: any,
  mouvement: number,
  target: ActivationTarget
): Promise<void> {
  if (target.kind !== "riff") return;

  await updateRiffs(holder, mouvement, (entry) => {
    const { [target.id]: _dropped, ...kept } = entry.activations ?? {};
    return { ...entry, activations: kept };
  });
}

// ========================================
// La correction, qui n'est pas un riff
// ========================================

async function updateCorrection(
  holder: any,
  mouvement: number,
  change: (payments: Payment[]) => Payment[]
): Promise<void> {
  const payments = change(correctionPayments(holder, mouvement));
  await updateRiffs(holder, mouvement, (entry) => ({ ...entry, correction: payments }));
}

export async function addCorrectionPayment(holder: any, mouvement: number): Promise<void> {
  await updateCorrection(holder, mouvement, (payments) => [
    ...payments,
    { resource: "rythme", amount: 1 },
  ]);
}

export async function removeCorrectionPayment(
  holder: any,
  mouvement: number,
  index: number
): Promise<void> {
  await updateCorrection(holder, mouvement, (payments) =>
    payments.filter((_payment, i) => i !== index)
  );
}

export async function updateCorrectionPayment(
  holder: any,
  mouvement: number,
  index: number,
  change: Partial<Payment>
): Promise<void> {
  await updateCorrection(holder, mouvement, (payments) =>
    normalizePayments(
      payments.map((payment, i) => (i === index ? { ...payment, ...change } : payment))
    )
  );
}

/** Rend à la correction le prix du livre. */
export async function resetCorrection(holder: any, mouvement: number): Promise<void> {
  await updateRiffs(holder, mouvement, (entry) => {
    const { correction: _dropped, ...rest } = entry;
    return rest;
  });
}

/** Un riff du livre est-il ouvert à ce mouvement ? */
export async function setRiffSelected(
  holder: any,
  mouvement: number,
  id: string,
  selected: boolean
): Promise<void> {
  await updateRiffs(holder, mouvement, (entry) => ({
    ...entry,
    selected: selected
      ? [...new Set([...entry.selected, id])]
      : entry.selected.filter((riff) => riff !== id),
  }));
}

/** Une ligne vierge, à qui il ne manque qu'un nom pour exister. */
export async function addCustomRiff(
  holder: any,
  mouvement: number,
  audience: RiffAudience
): Promise<void> {
  await updateRiffs(holder, mouvement, (entry) => ({
    ...entry,
    custom: [...entry.custom, { name: "", description: "", audience }],
  }));
}

export async function removeCustomRiff(
  holder: any,
  mouvement: number,
  index: number
): Promise<void> {
  await updateRiffs(holder, mouvement, (entry) => ({
    ...entry,
    custom: entry.custom.filter((_riff, i) => i !== index),
  }));
}

export async function updateCustomRiff(
  holder: any,
  mouvement: number,
  index: number,
  change: Partial<CustomRiff>
): Promise<void> {
  await updateRiffs(holder, mouvement, (entry) => ({
    ...entry,
    custom: entry.custom.map((riff, i) =>
      i === index ? { ...riff, ...change } : riff
    ),
  }));
}

/**
 * Branche l'éditeur de riffs sur le document qui les porte.
 *
 * Le même bloc de gabarit sert sur une prime et sur un type de session, donc le
 * même câblage aussi - `holder` est la seule chose qui change entre les deux.
 */
export function wireRiffEditor(html: JQuery, holder: any): void {
  const mouvementOf = (element: HTMLElement) =>
    parseInt(element.dataset.mouvement ?? "-1");
  const indexOf = (element: HTMLElement) =>
    parseInt(element.dataset.index ?? "-1");

  html.find(".cowboy-riff-toggle").on("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    void setRiffSelected(
      holder,
      mouvementOf(input),
      input.dataset.riff ?? "",
      input.checked
    );
  });

  html.find(".cowboy-riff-custom-add").on("click", (event) => {
    const button = event.currentTarget as HTMLElement;
    void addCustomRiff(
      holder,
      mouvementOf(button),
      button.dataset.audience === "bigshot" ? "bigshot" : "hunter"
    );
  });

  html.find(".cowboy-riff-custom-remove").on("click", (event) => {
    const button = event.currentTarget as HTMLElement;
    void removeCustomRiff(holder, mouvementOf(button), indexOf(button));
  });

  html.find(".cowboy-riff-custom-name").on("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    void updateCustomRiff(holder, mouvementOf(input), indexOf(input), {
      name: input.value,
    });
  });

  html.find(".cowboy-riff-custom-description").on("change", (event) => {
    const input = event.currentTarget as HTMLTextAreaElement;
    void updateCustomRiff(holder, mouvementOf(input), indexOf(input), {
      description: input.value,
    });
  });

  // ----------------------------------------
  // Le prix et les effets, formulaire partagé
  // ----------------------------------------
  //
  // La cible voyage entière dans `data-target`, telle que `riffEditor` l'a
  // sérialisée, mouvement compris. Le gabarit ne la recompose pas : il la
  // recopie. Une cible qu'on ne sait pas relire ne déclenche rien, plutôt que
  // d'écrire au hasard sur le premier riff venu.
  const targetOf = (
    serialized: string
  ): { target: ActivationTarget; mouvement: number } | undefined => {
    try {
      const { mouvement, ...target } = JSON.parse(serialized);
      if (target.kind !== "riff" && target.kind !== "custom") return undefined;
      if (!Number.isInteger(mouvement)) return undefined;

      return { target, mouvement };
    } catch {
      return undefined;
    }
  };

  wireActivationEditor(
    html,
    (serialized, change) => {
      const parsed = targetOf(serialized);
      if (parsed) void updateActivation(holder, parsed.mouvement, parsed.target, change);
    },
    (serialized, value) => {
      const parsed = targetOf(serialized);
      if (parsed) void replaceActivation(holder, parsed.mouvement, parsed.target, value);
    }
  );

  html.find(".cowboy-activation-reset").on("click", (event) => {
    event.preventDefault();
    const parsed = targetOf((event.currentTarget as HTMLElement).dataset.target ?? "");
    if (parsed) void resetActivation(holder, parsed.mouvement, parsed.target);
  });

  // ----------------------------------------
  // La correction, qui n'est pas une activation
  // ----------------------------------------

  html.find(".cowboy-correction-payment-add").on("click", (event) => {
    event.preventDefault();
    void addCorrectionPayment(holder, mouvementOf(event.currentTarget as HTMLElement));
  });

  html.find(".cowboy-correction-payment-remove").on("click", (event) => {
    event.preventDefault();
    const button = event.currentTarget as HTMLElement;
    void removeCorrectionPayment(holder, mouvementOf(button), indexOf(button));
  });

  html.find(".cowboy-correction-payment-resource").on("change", (event) => {
    const select = event.currentTarget as HTMLSelectElement;
    void updateCorrectionPayment(holder, mouvementOf(select), indexOf(select), {
      resource: select.value as Payment["resource"],
    });
  });

  html.find(".cowboy-correction-payment-amount").on("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    void updateCorrectionPayment(holder, mouvementOf(input), indexOf(input), {
      amount: Number.parseInt(input.value),
    });
  });

  html.find(".cowboy-correction-reset").on("click", (event) => {
    event.preventDefault();
    void resetCorrection(holder, mouvementOf(event.currentTarget as HTMLElement));
  });
}
