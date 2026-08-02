import { mouvements, riffs, sessionTypeItem, sessionTypePack } from "./constants";
import {
  CustomRiff,
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
      })
    ),
  };
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
    .map((riff) => ({
      name: riffName(riff.id),
      description: riffDescription(riff.id),
      audience: riff.audience,
      custom: false,
    }));

  const fromSession = selection.custom
    .filter((riff) => riff.audience === audience && riff.name.trim() !== "")
    .map((riff) => ({ ...riff, custom: true }));

  return [...fromBook, ...fromSession];
}

/**
 * La table entière, telle que Big Shot l'édite : un bloc par mouvement, chacun
 * listant tous les riffs du livre avec leur état, séparés par public, plus les
 * riffs libres de ce mouvement.
 */
export function riffEditor(holder: any, currentMouvement?: number): any[] {
  return mouvements.map((mouvement, index) => {
    const selection = riffSelection(holder, index);

    // Chaque famille reporte le mouvement et le public auxquels elle
    // appartient. C'est redondant, et c'est le but : le gabarit lit ce dont il
    // a besoin là où il est, sans remonter de contexte à coups de `../../..`,
    // qu'un bloc ajouté ou retiré suffirait à décaler en silence.
    const family = (audience: RiffAudience, title: string, icon: string) => ({
      audience,
      title,
      icon,
      mouvement: index,
      catalog: riffs
        .filter((riff) => riff.audience === audience)
        .map((riff) => ({
          id: riff.id,
          name: riffName(riff.id),
          description: riffDescription(riff.id),
          selected: selection.selected.includes(riff.id),
          mouvement: index,
        })),
      custom: selection.custom
        .map((riff, customIndex) => ({
          ...riff,
          index: customIndex,
          mouvement: index,
        }))
        .filter((riff) => riff.audience === audience),
    });

    return {
      mouvement: index,
      name: mouvement.name,
      // Celui que la table joue en ce moment, que la fiche déplie au lieu de
      // laisser Big Shot le chercher parmi trois blocs repliés. Un type de
      // session ne joue aucun mouvement : ses trois blocs restent fermés.
      current: currentMouvement === index,
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

  const pack = (game as any).packs?.get(sessionTypePack);
  const packed = pack
    ? (await pack.getIndex())
        .filter((entry: any) => entry.type === sessionTypeItem)
        .map((entry: any) => ({
          id: entry.uuid ?? `Compendium.${sessionTypePack}.${entry._id}`,
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
}
