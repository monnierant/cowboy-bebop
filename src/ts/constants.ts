import { id } from "../system.json";
import { Mouvement, Colors, Payment, Riff } from "./types";

export const moduleId: string = id;

export const genres: string[] = ["rock", "blues", "jazz", "dance", "tango"];

// How many session traits a prime carries. Three lines is what the sheet draws
// whatever a given prime happens to have stored, so the count lives here rather
// than being read off the data it is meant to correct.
export const SESSION_TRAITS = 3;

// Les chambres du barillet d'un chasseur. « Il ne peut procéder ainsi que six
// fois avant que son personnage ne doive affronter son passé. »
export const CARTRIDGES = 6;

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
  {
    id: "involve",
    audience: "hunter",
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "cartridge", amount: 1 }]],
      effects: [{ kind: "dice", amount: 2 }],
    },
  },
  {
    id: "showWounds",
    audience: "hunter",
    // Le seul riff du livre qui ne coûte aucune ressource : ce qu'il coûte est
    // le désavantage lui-même, qui est un effet et non un prix.
    activation: {
      conditions: [],
      paymentOptions: [],
      effects: [
        { kind: "advantage", amount: -1 },
        { kind: "heal", amount: 2 },
      ],
    },
  },
  {
    id: "force",
    audience: "hunter",
    // « Déclencher deux fausses notes afin de faire un carton » : la garde du
    // livre - « s'il n'a pas obtenu le maximum de deux cartons » - n'a pas
    // besoin d'être écrite. Un effet qui ne peut plus rien ajouter grise son
    // propre bouton.
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "note", amount: 2 }]],
      effects: [{ kind: "cartons", amount: 1 }],
    },
  },
  {
    id: "doubleOrNothing",
    audience: "hunter",
    phase: "card",
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "stakeTrait", amount: 1 }]],
      effects: [{ kind: "transformResult", operation: "rerollPool" }],
    },
  },
  {
    id: "solo",
    audience: "hunter",
    bespoke: true,
    // Ne se déduit de rien : « avant ou après un test », « même s'il
    // n'intervient pas dans le test ». Sa place est la fiche.
    phase: "sheet",
    activation: { conditions: [], paymentOptions: [[{ resource: "rythme", amount: 1 }]], effects: [] },
  },
  {
    id: "assist",
    audience: "hunter",
    owed: true,
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "rythme", amount: 1 }]],
      effects: [{ kind: "advantage", amount: 1 }],
    },
  },
  {
    id: "improvise",
    audience: "hunter",
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "rythme", amount: 1 }]],
      effects: [{ kind: "approach", amount: 1 }],
    },
  },
  {
    id: "jam",
    audience: "hunter",
    owed: true,
    // « Il confère non seulement l'avantage, mais aussi son groove. » Le groove
    // n'est pas modélisé (ADR 0009) : Jam ! se comporte donc comme Assister, et
    // le menu nomme déjà l'assistant pour le jour où la règle sera tranchée.
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "rythme", amount: 1 }]],
      effects: [{ kind: "advantage", amount: 1 }],
    },
  },
  {
    id: "risqueNote",
    audience: "bigshot",
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "risque", amount: 1 }]],
      effects: [{ kind: "notes", amount: 1 }],
    },
  },
  {
    id: "risqueDisadvantage",
    audience: "bigshot",
    // Le désavantage se fixe au lancer, dans une boîte qui appartient au
    // joueur : Big Shot l'annonce, le joueur le choisit. Le riff reste donc un
    // badge, et `owed` dit exactement ça - la dette est rappelée, jamais
    // débitée (ADR 0009).
    owed: true,
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "risque", amount: 1 }]],
      effects: [{ kind: "advantage", amount: -1 }],
    },
  },
  {
    id: "risqueDoubleNote",
    audience: "bigshot",
    activation: {
      conditions: [],
      paymentOptions: [[{ resource: "risque", amount: 1 }]],
      effects: [{ kind: "notes", amount: 2 }],
    },
  },
];

/**
 * Le seul riff qui ne se joue ni dans la boîte de jet ni sur une carte.
 *
 * Nommé ici parce que la fiche du chasseur doit le reconnaître pour lui donner
 * son bouton, et qu'un identifiant recopié en toutes lettres à trois endroits
 * finit toujours par diverger d'un.
 */
export const soloRiff = "solo";

/**
 * Le prix d'une correction, qui n'est pas un riff mais une règle de base.
 *
 * Deux paiements dont on choisit un, exactement comme le code les traitait déjà
 * séparément : la cartouche et le trait entamé. C'est la première chose
 * qu'une session filler déplace vers le rythme (ADR 0008).
 */
export const CORRECTION_PAYMENTS: Payment[] = [
  { resource: "cartridge", amount: 1 },
  { resource: "dentTrait", amount: 1 },
];

// Le vocabulaire des prix et des effets vit dans `rolls/activationTerms.ts`, qui
// n'importe rien - pas même ce fichier, qui lit `system.json`. Ce qui est ici
// est le catalogue du livre : une donnée qui *parle* ce vocabulaire, pas
// l'endroit qui le définit. Réexporté pour que personne n'ait à savoir lequel
// des deux fichiers ouvrir.
export {
  COUNTER_OF,
  EFFECT_PHASE,
  effectKinds,
  paymentResources,
} from "./rolls/activationTerms";

/** Le type d'Item qui porte un type de session, et le pack qui les livre. */
export const sessionTypeItem = "sessionType";
export const sessionTypePack = `${id}.types-de-session`;
export const sessionTypePackEn = `${id}.types-de-session-en`;

// Un groove est un Item possédé, et non un catalogue en dur comme les riffs :
// c'est du contenu, pas un vocabulaire. Une table doit pouvoir en écrire un sans
// toucher au code, et le compendium se recharge sans rien réécrire sur les
// personnages (ADR 0010).
export const grooveItem = "groove";
export const groovePack = `${id}.grooves`;

// Les deux vaisseaux sont des Actors et non des Items, parce qu'un Item n'a pas
// de Token : rien d'autre dans Foundry ne se pose sur une scène (voir ADR 0004).
export const monoActor = "mono";
export const vaisseauMereActor = "vaisseauMere";

// Le MONO du livre tient en trois hexagones dont son nom. Le nom reste le nom
// Foundry - c'est l'étiquette du pion - donc seuls les deux autres sont rangés
// dans `system.traits`, et l'état du premier vit à part.
export const MONO_TRAITS = 2;

// Les trois colonnes du tableau des vaisseaux mères. Elles ne sont pas
// interchangeables : les deux premières portent un thème, la dernière un ton.
export const vaisseauMereDescriptors = ["style", "exterior", "interior"] as const;

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
