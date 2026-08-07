/**
 * Ce qu'un groove porte, et ce qu'il faut en déduire.
 *
 * Comme `activationTerms.ts`, ce module ne connaît ni Foundry, ni `game`, ni le
 * DOM, et n'importe que des types - pas `constants.ts`, qui lit `system.json`.
 * C'est ce qui permet au harnais de `test/grooves.mjs` de le charger tel quel
 * sous node.
 *
 * Ce que ce module ne sait pas : quel acteur porte quel groove, quelles
 * activations courent en ce moment, et comment on écrit quoi que ce soit.
 * Ceux-là vivent dans `grooves.ts`, qui appelle d'ici.
 *
 * Un groove porte trois choses et seulement trois - ses Activations, sa
 * Substitution, ses Rappels. Voir l'ADR 0013 pour la frontière entre les trois,
 * et l'ADR 0010 pour ce qu'un groove est et pourquoi il n'est pas un riff.
 */

import { normalizeActivation } from "./activationTerms.js";
import type {
  Groove,
  GrooveAudience,
  ReminderAudience,
  Substitution,
} from "../types";

export const grooveAudiences: GrooveAudience[] = ["chasseur", "prime"];

/** Big Shot d'abord : c'est le défaut d'un rappel qui ne dit rien. */
export const reminderAudiences: ReminderAudience[] = ["bigshot", "table"];

export function readAudience(value: unknown): GrooveAudience {
  return value === "prime" ? "prime" : "chasseur";
}

/**
 * Une substitution lisible, ou rien du tout.
 *
 * Une approche source vide vaut « aucune substitution » : c'est ainsi que les
 * vingt-huit grooves qui n'en portent pas s'écrivent, sans champ à cocher en
 * plus. Une cible qui répète la source est jetée - prêter le rock au rock
 * n'ouvre rien et n'aurait servi qu'à faire douter de la lecture.
 */
export function normalizeSubstitution(
  stored: unknown
): Substitution | undefined {
  const from = String((stored as any)?.from ?? "").trim();
  if (!from) return undefined;

  const to = Array.from(
    new Set(
      (Array.isArray((stored as any)?.to) ? (stored as any).to : [])
        .map((approach: unknown) => String(approach ?? "").trim())
        .filter((approach: string) => approach !== "" && approach !== from)
    )
  ) as string[];

  if (to.length === 0) return undefined;

  return { from, to };
}

/** Un groove entier, tel qu'on le relit sur son item. */
export function normalizeGroove(stored: unknown): Groove {
  const source = stored as any;

  return {
    audience: readAudience(source?.audience),
    description: String(source?.description ?? ""),
    substitution: normalizeSubstitution(source?.substitution),
    activations: (Array.isArray(source?.activations) ? source.activations : [])
      .map((activation: unknown) => normalizeActivation(activation)),
    reminders: (Array.isArray(source?.reminders) ? source.reminders : [])
      .filter((reminder: any) => typeof reminder?.text === "string")
      .map((reminder: any) => ({
        text: reminder.text,
        audience: reminder.audience === "table" ? "table" : "bigshot",
      })),
  };
}

/**
 * Les approches que ces substitutions ouvrent pour un test donné.
 *
 * On lit dans le sens inverse de l'écriture : le groove dit « les traits de Rock
 * servent aux tests de Blues », donc un test de Blues ouvre Rock. L'approche du
 * test elle-même n'est jamais rendue - elle est déjà en jeu, et la rendre ferait
 * croire qu'un groove l'y a mise.
 *
 * Plusieurs substitutions parce qu'un Jam ! en prête une seconde : c'est le seul
 * moment où un test en connaît deux.
 */
export function openedApproaches(
  substitutions: (Substitution | undefined)[],
  category: string
): string[] {
  const opened = substitutions
    .filter((substitution): substitution is Substitution => !!substitution)
    .filter((substitution) => substitution.to.includes(category))
    .map((substitution) => substitution.from)
    .filter((approach) => approach !== category);

  return Array.from(new Set(opened));
}
