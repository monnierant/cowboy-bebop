import { id } from "../system.json";
import { Mouvement, Colors, Riff } from "./types";

export const moduleId: string = id;

export const genres: string[] = ["rock", "blues", "jazz", "dance", "tango"];

// How many session traits a prime carries. Three lines is what the sheet draws
// whatever a given prime happens to have stored, so the count lives here rather
// than being read off the data it is meant to correct.
export const SESSION_TRAITS = 3;

// The one prime the table is currently hunting. A world setting rather than a
// flag on each prime: there is exactly one, so it deserves exactly one place to
// live. The previous per-actor boolean kept that invariant by looping over every
// prime to switch the others off, which only held if the writer owned them all.
export const activePrimeSetting = "activePrime";
export const signConventionSetting = "signConventionVersion";

// Where the wanted poster of the prime in play hangs. A world setting: the GM
// lays out the table's shared view, the way they already choose who is hunted.
export const posterPositionSetting = "posterPosition";

// Edges first, then corners, then off. An edge poster is a strip across the
// screen; a corner one is a small card that leaves both edges free.
export const posterPositions = [
  "top",
  "bottom",
  "left",
  "right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "hidden",
] as const;

export type PosterPosition = (typeof posterPositions)[number];

// Which prime a dial belongs to. Dials are world-level documents so that
// Foundry's per-dial ownership works - an embedded Item inherits its parent
// actor's permissions, which would mean handing a player the whole prime sheet
// to let them fill one objective dial. The link is therefore a flag, not parentage.
export const primeFlag = "prime";

// Les trois actes d'une session, dans l'ordre du livre. Un type de session en
// joue un, trois, ou trois à l'envers : c'est une liste d'identités, pas une
// progression. Le nombre de dés de base vaut le rang du mouvement.
export const mouvements: Mouvement[] = [
  { name: "OK", difficulty: 5, dices: 1, notes: 1 },
  { name: "3, 2, 1…", difficulty: 10, dices: 2, notes: 1 },
  { name: "Let's jam !", difficulty: 15, dices: 3, notes: 2 },
];

// Les riffs du livre : ce qu'un chasseur peut jouer pendant un test, et ce que
// Big Shot peut lui opposer en dépensant un risque.
//
// Rien ici ne dit à quel mouvement un riff est ouvert. Cette vérité appartient
// aux types de session, et à eux seuls (voir ADR 0003) : le même riff est
// ouvert au premier mouvement d'une session classique et jamais d'une filler.
// Ne restent donc que l'identifiant, stable, et le public visé - nom et rappel
// sont traduits sous `COWBOY.riffs.catalog.<id>`.
export const riffs: Riff[] = [
  { id: "involve", audience: "hunter" },
  { id: "showWounds", audience: "hunter" },
  { id: "force", audience: "hunter" },
  { id: "doubleOrNothing", audience: "hunter" },
  { id: "solo", audience: "hunter" },
  { id: "assist", audience: "hunter" },
  { id: "improvise", audience: "hunter" },
  { id: "jam", audience: "hunter" },
  { id: "risqueNote", audience: "bigshot" },
  { id: "risqueDisadvantage", audience: "bigshot" },
  { id: "risqueDoubleNote", audience: "bigshot" },
];

/** Le type d'Item qui porte un type de session, et le pack qui les livre. */
export const sessionTypeItem = "sessionType";
export const sessionTypePack = `${id}.types-de-session`;

export const colors: Colors = {
  rock: {
    on: "#f44336",
    off: "#e57373",
    fa: "fa-bolt-lightning",
  },
  blues: {
    on: "#2196f3",
    off: "#64b5f6",
    fa: "fa-guitar",
  },
  jazz: {
    on: "#ff9800",
    off: "#ffb74d",
    fa: "fa-record-vinyl",
  },
  dance: {
    on: "#4caf50",
    off: "#81c784",
    fa: "fa-drum",
  },
  tango: {
    on: "#9c27b0",
    off: "#ba68c8",
    fa: "fa-shoe-prints",
  },
  closed: {
    on: "#444444",
    off: "#aaaaaa",
    fa: "fa-lock",
  },
};
