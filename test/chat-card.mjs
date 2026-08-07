// Le contrat du bouton de collecte sur une carte fraîchement lancée.
//
// Foundry compile ce même gabarit avec Handlebars. Le rendre ici permet de
// vérifier le libellé et l'icône visibles avant toute collecte, sans démarrer
// l'application entière.

import fs from "node:fs";
import Handlebars from "handlebars";
import { range } from "./.out/handlebarsHelpers/range.js";

Handlebars.registerHelper("eq", (left, right) => left === right);
Handlebars.registerHelper("gt", (left, right) => left > right);
Handlebars.registerHelper("gte", (left, right) => left >= right);
Handlebars.registerHelper("or", (...values) => values.slice(0, -1).some(Boolean));
Handlebars.registerHelper("and", (...values) => values.slice(0, -1).every(Boolean));
Handlebars.registerHelper("range", range);
Handlebars.registerHelper("localize", (key) => ({
  "COWBOY.roll.actions.collect": "Collect",
  "COWBOY.roll.actions.collected": "Collected",
}[key] ?? key));

const template = Handlebars.compile(
  fs.readFileSync(new URL("../src/templates/chat/roll.hbs", import.meta.url), "utf8")
);
const html = template({
  actor: { id: "spike", system: { cartridge: 0 } },
  result: { formula: "2d6", terms: [] },
  mouvement: { difficulty: 10, modifier: 0 },
  total: 10,
  notes: 1,
  carton: 1,
  category: "rock",
  genre: "jazz",
  traits: [],
  canCorrect: false,
  canStake: false,
});

const collectButton = html.match(/<button[\s\S]*?data-action="collect"[\s\S]*?<\/button>/)?.[0];
if (!collectButton) throw new Error("La carte fraîche n'affiche aucun bouton de collecte");
if (!collectButton.includes("fa-circle-plus")) {
  throw new Error("Le bouton de collecte initial n'affiche pas l'icône +");
}
if (!collectButton.includes("Collect") || collectButton.includes("Collected")) {
  throw new Error("Le bouton de collecte initial n'affiche pas « Collect »");
}

console.log("ok   la carte fraîche affiche + Collect");

// ========================================
// Ce que les riffs ajoutent sur la carte
// ========================================
//
// La carte porte désormais quatre blocs que rien d'autre ne compile avant
// Foundry : les paiements d'une correction, les riffs d'après le jet des deux
// bords, le rappel d'une assistance et la liste de ce qui a été plaqué. Un
// gabarit cassé s'y verrait à la première partie et nulle part avant.

const rich = template({
  actor: { id: "spike", system: { cartridge: 3 } },
  result: { formula: "3d6", terms: [] },
  mouvement: { difficulty: 10, modifier: 0 },
  total: 12,
  notes: 2,
  carton: 1,
  category: "rock",
  genre: "jazz",
  traits: [
    { key: "hunter:rock:0", name: "Tir instinctif", state: "usable", isMono: false, blocked: false },
  ],
  canCorrect: true,
  canStake: true,
  canVoidNote: true,
  // Une session personnelle : cartouche ou rythme, au choix, plus le trait.
  correction: {
    counters: [
      { resource: "cartridge", amount: 1, label: "cartouche" },
      { resource: "rythme", amount: 1, label: "rythme", blocked: "Il faut rythme ; il en reste 0." },
    ],
    byTrait: true,
  },
  hunterRiffs: [
    {
      id: "force",
      name: "Forcer",
      description: "Deux fausses notes pour un carton.",
      custom: false,
      choices: [{ index: 0, resource: "note", amount: 2, label: "2 fausses notes" }],
    },
  ],
  bigshotRiffs: [
    {
      id: "risqueNote",
      name: "Fausse note",
      description: "Un risque pour une fausse note.",
      custom: false,
      choices: [{ index: 0, resource: "risque", amount: 1, label: "risque" }],
    },
  ],
  assist: { name: "Jet", costLabel: "rythme" },
  played: [{ id: "involve", name: "S'impliquer" }],
});

const has = (label, pattern) => {
  if (!pattern.test(rich)) throw new Error(`La carte n'affiche pas ${label}`);
};

// Les deux paiements d'une correction, dont un grisé avec son motif.
has("le paiement en cartouche", /data-action="correct-pay"[\s\S]*?data-resource="cartridge"/);
has("le paiement en rythme", /data-action="correct-pay"[\s\S]*?data-resource="rythme"/);
if (!/data-resource="rythme"[\s\S]*?disabled/.test(rich)) {
  throw new Error("Le paiement impayable n'est pas grisé");
}

// Entamer un trait n'est proposé que si la session accepte ce paiement.
has("le bouton d'entame", /data-action="damage-trait"/);
has("le bouton de mise", /data-action="stake-trait"/);

// Un riff d'après le jet, par bord.
has("Forcer", /data-action="play-riff"[\s\S]*?data-riff="force"/);
has("le riff de Big Shot", /data-action="play-riff"[\s\S]*?data-riff="risqueNote"/);

// Les options de Big Shot portent la classe que le hook retire aux joueurs.
const bigshot = /<div class="cowboy-roll-riffs is-bigshot([\s\S]*?)<\/div>/.exec(rich)?.[0] ?? "";
if (!bigshot.includes("cowboy-roll-action-gm")) {
  throw new Error("Les riffs de Big Shot ne portent pas la classe réservée au MJ");
}

// Ce que Big Shot raye d'autorité : hors de la liste des riffs, sans aucun
// paiement à désigner, et réservé au MJ par la classe que le hook lui laisse.
has("l'annulation de fausse note", /data-action="void-note"/);
const voidButton =
  /<div class="cowboy-roll-void[\s\S]*?<\/div>/.exec(rich)?.[0] ?? "";
if (!voidButton.includes("cowboy-roll-action-gm")) {
  throw new Error("L'annulation de fausse note n'est pas réservée au MJ");
}
if (/data-resource=|data-riff=/.test(voidButton)) {
  throw new Error("L'annulation de fausse note fait payer quelque chose");
}

// Une dette rappelée, jamais débitée.
has("le rappel d'assistance", /cowboy-roll-assist[\s\S]*?Jet/);
// L'apostrophe part échappée par Handlebars : c'est ce qu'on veut, un nom de
// riff étant du texte que Big Shot a pu écrire.
has("les riffs joués", /cowboy-roll-played[\s\S]*?impliquer/);

console.log("ok   la carte porte les riffs, la correction et l'assistance");

// La correction sans paiement en trait ne doit offrir aucun bouton d'entame :
// c'est ce qu'une session filler fait quand elle retire la cartouche.
const noTrait = template({
  actor: { id: "spike", system: { cartridge: 3 } },
  result: { formula: "3d6", terms: [] },
  mouvement: { difficulty: 10, modifier: 0 },
  total: 12,
  notes: 1,
  carton: 1,
  category: "rock",
  genre: "jazz",
  traits: [
    { key: "hunter:rock:0", name: "Tir instinctif", state: "usable", isMono: false, blocked: false },
  ],
  canCorrect: true,
  canStake: false,
  correction: { counters: [{ resource: "rythme", amount: 1, label: "rythme" }], byTrait: false },
  hunterRiffs: [],
  bigshotRiffs: [],
  assist: null,
  played: [],
});

if (/data-action="damage-trait"/.test(noTrait)) {
  throw new Error("Une session qui n'accepte pas le trait propose quand même de l'entamer");
}
if (!/data-resource="rythme"/.test(noTrait)) {
  throw new Error("La correction en rythme n'est pas proposée");
}
// Un test soldé, ou sans plus une seule fausse note, n'offre plus rien à rayer.
if (/data-action="void-note"/.test(noTrait)) {
  throw new Error("L'annulation est proposée alors qu'il n'y a rien à annuler");
}

console.log("ok   une session sans paiement en trait n'en propose pas");

const settledSource = fs.readFileSync(
  new URL("../src/templates/chat/roll-collected.hbs", import.meta.url),
  "utf8"
);
if (/{{#range\s+\S+\s+\S+}}/.test(settledSource)) {
  throw new Error("Un bloc range omet le contexte requis par Foundry");
}
const settledTemplate = Handlebars.compile(settledSource);
const settledHtml = settledTemplate({
  cartons: 1,
  notes: 1,
  hunterName: "Spike",
  primeName: "Asimov",
  genre: "rock",
});
if (!settledHtml.includes("cowboy-carton") || !settledHtml.includes("cowboy-note")) {
  throw new Error("Le récapitulatif de collecte ne rend pas ses jetons");
}

console.log("ok   la collecte rend son récapitulatif sans erreur Handlebars");
