import { MONO_TRAITS, moduleId, monoActor } from "./constants";
import { PoolTrait, Trait } from "./types";

/**
 * Le MONO d'un chasseur : ce que le livre dessine comme trois hexagones à
 * l'écart des autres sur la fiche de personnage.
 *
 * Le premier hexagone est le nom de l'appareil, et il s'use comme les deux
 * autres - c'est tout le sel du chapitre, le Swordfish II qui cesse d'être le
 * Swordfish II. Mais le nom d'un Actor est aussi l'étiquette de son pion sur la
 * scène, donc il reste une chaîne nue et seul son état de dégât vit dans
 * `system.nameState`. Les fonctions d'ici recollent les deux, pour que le reste
 * du système voie bien trois traits et n'ait jamais à connaître ce détail de
 * rangement : l'index 0 est le nom, 1 et 2 sont les traits libres.
 */

/** Une adresse suffisante pour retrouver un trait, quel que soit son porteur. */
export interface TraitAddress {
  index: number;
  /** Vrai pour l'index 0 d'un MONO, dont l'état vit à part du nom. */
  isName: boolean;
}

export const monoTraitAddress = (index: number): TraitAddress => ({
  index,
  isName: index === 0,
});

/** Le MONO lié à un chasseur ou à une prime, s'il en a un qui existe encore. */
export function monoOf(actor: any): any {
  const uuid = String(actor?.system?.mono ?? "").trim();
  if (!uuid) return null;

  // Un MONO est un acteur du monde, jamais un embarqué : `fromUuidSync` suffit
  // et évite de rendre asynchrone tout ce qui construit une réserve de dés.
  const mono = (foundry as any).utils?.fromUuidSync?.(uuid) ?? null;
  return mono?.type === monoActor ? mono : null;
}

/**
 * Les trois hexagones, remis dans l'ordre du livre. Le nom d'abord, puis les
 * deux traits libres, chacun avec ses deux degrés d'usure.
 */
export function monoTraits(mono: any): Trait[] {
  const nameState = mono?.system?.nameState ?? {};
  const stored: Trait[] = Array.from(
    { length: MONO_TRAITS },
    (_unused, index) => {
      const trait = mono?.system?.traits?.[index] ?? {};
      return {
        name: String(trait.name ?? ""),
        dented: trait.dented === true,
        broken: trait.broken === true,
      };
    }
  );

  return [
    {
      name: String(mono?.name ?? ""),
      dented: nameState.dented === true,
      broken: nameState.broken === true,
    },
    ...stored,
  ];
}

/**
 * Ce que le MONO ajoute à une réserve de dés.
 *
 * Aucun genre n'est demandé : le livre dit que ces traits servent « quelle que
 * soit la situation », et c'est ce qui rend un MONO désirable - il élargit la
 * palette au lieu de creuser une colonne (voir ADR 0006).
 */
export function monoPoolTraits(mono: any): PoolTrait[] {
  if (!mono) return [];

  const uuid = String(mono.uuid ?? "");
  return monoTraits(mono)
    .map((trait, index) => ({ trait, index }))
    .filter(({ trait }) => !trait.dented && trait.name !== "")
    .map(({ trait, index }) => ({
      key: `mono:${index}`,
      name: trait.name,
      source: "mono" as const,
      category: "",
      index,
      monoUuid: uuid,
    }));
}

/** Trois hexagones tombés : le pilote doit abandonner la poursuite. */
export function isOutOfChase(mono: any): boolean {
  return monoTraits(mono).every((trait) => trait.dented);
}

/**
 * Marque un des trois hexagones, et annonce le moment où le dernier tombe.
 *
 * L'annonce est décidée ici plutôt que par l'appelant parce qu'elle dépend du
 * franchissement, pas de l'état : réparer puis réentamer doit le redire, mais
 * entamer un trait déjà tombé ne doit rien redire du tout.
 */
export async function damageMonoTrait(
  mono: any,
  index: number,
  dented: boolean,
  broken: boolean
): Promise<void> {
  if (!mono) return;

  const wasOut = isOutOfChase(mono);

  if (monoTraitAddress(index).isName) {
    await mono.update({ "system.nameState": { dented, broken } });
  } else {
    const traits = monoTraits(mono)
      .slice(1)
      .map((trait, position) =>
        position === index - 1 ? { ...trait, dented, broken } : trait
      );
    await mono.update({ "system.traits": traits });
  }

  if (!wasOut && isOutOfChase(mono)) await announceOutOfChase(mono);
}

/**
 * Renomme un des trois hexagones. Le premier écrit le nom de l'acteur, donc
 * renommer le MONO depuis la fiche de son pilote renomme aussi son pion.
 */
export async function renameMonoTrait(
  mono: any,
  index: number,
  name: string
): Promise<void> {
  if (!mono) return;

  if (monoTraitAddress(index).isName) {
    await mono.update({ name });
    return;
  }

  const traits = monoTraits(mono)
    .slice(1)
    .map((trait, position) =>
      position === index - 1 ? { ...trait, name } : trait
    );
  await mono.update({ "system.traits": traits });
}

/** Ce dont les feuilles ont besoin pour dessiner les trois hexagones. */
export function monoSheetData(mono: any) {
  if (!mono) return { mono: null, monoTraits: [], monoUuid: "", monoOutOfChase: false };

  return {
    mono,
    monoUuid: String(mono.uuid ?? ""),
    monoOutOfChase: isOutOfChase(mono),
    monoTraits: monoTraits(mono).map((trait, index) => ({
      ...trait,
      index,
      isName: index === 0,
    })),
  };
}

/** Remet l'appareil à neuf, les traits brisés compris. */
export async function restoreMono(mono: any): Promise<void> {
  if (!mono) return;

  await mono.update({
    "system.nameState": { dented: false, broken: false },
    "system.traits": monoTraits(mono)
      .slice(1)
      .map((trait) => ({ ...trait, dented: false, broken: false })),
  });
}

/**
 * Passe la main à la joueuse.
 *
 * Rien n'est bloqué : un trait entamé ne donne déjà plus de dé, donc le MONO a
 * cessé tout seul d'apporter quoi que ce soit. Et la Poursuite n'existe pas
 * dans ce système - il n'y a pas d'objet à quitter, seulement un moment à
 * signaler.
 */
async function announceOutOfChase(mono: any): Promise<void> {
  const content = await renderTemplate(
    `systems/${moduleId}/templates/chat/mono-out.hbs`,
    { name: mono.name, img: mono.img }
  );

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor: mono }),
  } as any);
}
