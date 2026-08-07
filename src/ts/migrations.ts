import { genres } from "./constants";
import { Trait } from "./types";

/**
 * Renomme les deux degrés d'usure d'un trait sur les chasseurs déjà créés.
 *
 * Le code écrivait `damaged` et `hyperdamaged` là où le glossaire, les libellés
 * français et le livre disent entamé et brisé. Un seul couple de mots existe
 * désormais - mais un trait *brisé* est un état durable qu'aucune fin de
 * session ne rend, donc le renommer sans reprendre les données effacerait des
 * cicatrices que la table avait gagnées.
 *
 * Sans effet dès qu'elle a tourné une fois : elle ne regarde que les fiches qui
 * portent encore l'ancien nom.
 */
export async function migrateTraitDamageNames(): Promise<void> {
  if (!(game as any).user?.isGM) return;

  const hunters = ((game as any).actors?.contents ?? []).filter(
    (actor: any) => actor.type === "chasseur"
  );

  for (const hunter of hunters) {
    const update = hunterUpdate(hunter);
    if (update) await hunter.update(update);
  }
}

/** Ce qu'il faut réécrire sur ce chasseur, ou rien s'il est déjà à jour. */
function hunterUpdate(hunter: any): Record<string, unknown> | null {
  const update: Record<string, unknown> = {};
  const traits = hunter.system?.traits ?? {};

  const stale = genres.some((genre) =>
    (traits[genre] ?? []).some(
      (trait: any) => "damaged" in trait || "hyperdamaged" in trait
    )
  );

  if (stale) {
    for (const genre of genres) {
      update[`system.traits.${genre}`] = (traits[genre] ?? []).map(
        (trait: any): Trait => ({
          name: String(trait.name ?? ""),
          dented: trait.dented ?? trait.damaged ?? false,
          broken: trait.broken ?? trait.hyperdamaged ?? false,
        })
      );
    }
  }

  // `ship` n'a jamais été lu par une ligne de code : le lien vers le MONO le
  // remplace, et le laisser traîner ne ferait qu'égarer le prochain lecteur.
  if (hunter.system?.ship !== undefined) update["system.-=ship"] = null;

  return Object.keys(update).length > 0 ? update : null;
}
