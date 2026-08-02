import {
  activePrimeSetting,
  moduleId,
  posterPositions,
  posterPositionSetting,
  primeFlag,
  signConventionSetting,
  type PosterPosition,
} from "./constants";

// Who the table is hunting, and which dials belong to them.
//
// Two questions that used to be answered by data scattered across documents -
// a boolean on every prime, and parentage for the dials. Both now have a single
// place to live, and this module is it.

const dialType = "sliced-dials.dial";

export function registerPrimeSettings(): void {
  (game as any).settings.register(moduleId, activePrimeSetting, {
    name: "COWBOY.settings.activePrime",
    scope: "world",
    config: false,
    type: String,
    default: "",
    // The poster names whoever is in play, so a change of prime is a change of
    // poster - including the case where it has to disappear entirely.
    onChange: () => (ui as any).cowboyPrimePoster?.render(true),
  });

  (game as any).settings.register(moduleId, signConventionSetting, {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });

  (game as any).settings.register(moduleId, posterPositionSetting, {
    name: "COWBOY.settings.posterPosition",
    hint: "COWBOY.settings.posterPositionHint",
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(
      posterPositions.map((position) => [
        position,
        `COWBOY.settings.posterPositions.${position}`,
      ])
    ),
    default: "top",
    onChange: () => (ui as any).cowboyPrimePoster?.render(true),
  });
}

/** Where the wanted poster hangs, or "hidden" if the GM has put it away. */
export function getPosterPosition(): PosterPosition {
  const value = (game as any).settings?.get(moduleId, posterPositionSetting);
  return posterPositions.includes(value) ? value : "top";
}

/**
 * What the poster shows for a prime. Both halves are optional and independent:
 * a face with no name is a manhunt, a name with no face is a rumour.
 */
export function posterOptions(actor: any): {
  showImage: boolean;
  showName: boolean;
} {
  // Primes created before the poster existed have no such field, and the
  // default for them is the full poster rather than nothing at all.
  const poster = actor?.system?.poster;
  return {
    showImage: poster?.showImage ?? true,
    showName: poster?.showName ?? true,
  };
}

/**
 * Version 2 applies the final convention: every Cowboy Bebop dial accepts both
 * positive cartons and negative false notes. The fiction decides whether the
 * slice helps or hurts; "objective" and "threat" no longer hard-code payment.
 */
export async function migrateDialSignConvention(): Promise<void> {
  const user = (game as any).user;
  const activeGM = (game as any).users?.activeGM;
  if (!user?.isGM || (activeGM && activeGM !== user)) return;

  const version = Number(
    (game as any).settings.get(moduleId, signConventionSetting) ?? 0
  );
  if (version >= 2) return;

  const dials = ((game as any).items ?? []).filter((item: any) => {
    return (
      item.type === dialType &&
      item.system?.ruleset === moduleId &&
      item.getFlag(moduleId, primeFlag)
    );
  });

  await Promise.all(
    dials.map((dial: any) =>
      dial.update({
        "system.allowedSigns": ["+", "-"],
      })
    )
  );

  await (game as any).settings.set(moduleId, signConventionSetting, 2);
}

/** The prime currently in play, or undefined if the GM has not chosen one. */
export function getActivePrime(): any | undefined {
  const id = (game as any).settings?.get(moduleId, activePrimeSetting);
  if (!id) return undefined;

  const actor = (game as any).actors?.get(id);
  // A prime can be deleted without anyone thinking to clear the setting, so the
  // type is re-checked rather than trusted.
  return actor?.type === "prime" ? actor : undefined;
}

export function isActivePrime(actor: any): boolean {
  return !!actor?.id && actor.id === getActivePrime()?.id;
}

/**
 * Puts a prime in play. One write, and the previous one steps down by virtue of
 * no longer being named - there is nothing to switch off.
 */
export async function setActivePrime(actor: any | undefined): Promise<void> {
  await (game as any).settings.set(
    moduleId,
    activePrimeSetting,
    actor?.id ?? ""
  );

  // The setting is not a document, so nothing re-renders on its own. Every open
  // prime sheet shows whether it is the one in play, so every one of them is
  // now out of date.
  Object.values((ui as any).windows ?? {}).forEach((app: any) => {
    if (app?.actor?.type === "prime") app.render(false);
  });

  // Et toute fiche de chasseur ouverte : elle lit ses riffs sur la prime en
  // jeu, qui vient de changer.
  renderHunterSheets();

  // The combat tracker only shows dials of the active prime.
  (ui as any).combat?.render(false);
}

/**
 * Redessine les fiches de chasseur ouvertes.
 *
 * Une fiche de chasseur affiche une donnée qui ne lui appartient pas - le
 * mouvement et les riffs de la prime en jeu - et Foundry ne redessine un
 * document que pour lui-même. Sans ceci, Big Shot passe au mouvement suivant et
 * les joueurs continuent de lire le précédent : une aide de jeu qui ment en
 * silence est pire qu'une aide absente.
 */
function renderHunterSheets(): void {
  Object.values((ui as any).windows ?? {}).forEach((app: any) => {
    if (app?.actor?.type === "chasseur") app.render(false);
  });
}

/**
 * Ce qui, sur une prime, se lit ailleurs que sur sa propre fiche. Un changement
 * de nom ou de portrait ne concerne qu'elle ; ces trois champs-là concernent
 * toute la table.
 */
const sharedPrimeFields = ["mouvement", "riffs", "sessionType"];

export function registerPrimeHooks(): void {
  Hooks.on("updateActor", (actor: any, change: any) => {
    if (actor?.type !== "prime" || !isActivePrime(actor)) return;

    const touched = sharedPrimeFields.some(
      (field) => change?.system?.[field] !== undefined
    );
    if (touched) renderHunterSheets();
  });
}

/** Every dial in the world that has been linked to this prime. */
export function dialsOfPrime(actor: any): any[] {
  const id = actor?.id;
  if (!id) return [];

  return ((game as any).items ?? []).filter(
    (item: any) =>
      item.type === dialType && item.getFlag(moduleId, primeFlag) === id
  );
}

/** The prime a dial was linked to, if it still exists. */
export function primeOfDial(dial: any): any | undefined {
  const id = dial?.getFlag?.(moduleId, primeFlag);
  if (!id) return undefined;

  const actor = (game as any).actors?.get(id);
  return actor?.type === "prime" ? actor : undefined;
}

export async function linkDialToPrime(dial: any, actor: any): Promise<void> {
  await dial.setFlag(moduleId, primeFlag, actor.id);
}

export async function unlinkDial(dial: any): Promise<void> {
  await dial.unsetFlag(moduleId, primeFlag);
}

/** Dials not yet claimed by any prime - what the "associate" picker offers. */
export function unlinkedDials(): any[] {
  return ((game as any).items ?? []).filter(
    (item: any) => item.type === dialType && !primeOfDial(item)
  );
}
