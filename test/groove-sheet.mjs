// Les trois gabarits que les grooves ajoutent, compilés hors de Foundry.
//
// La feuille d'un groove, la vignette qu'une fiche d'acteur en montre, et les
// deux rappels — dans la boîte de jet, puis sur la carte. Aucun ne s'affiche
// ailleurs que dans Foundry, donc une balise mal fermée, un partial mal nommé ou
// un helper inventé ne se verraient qu'en pleine partie.
//
// Comme pour `riff-editor.mjs`, les données sont écrites à la main : `grooves.ts`
// lit `system.json` et `game`, que node n'a pas. Ce qu'on tient ici est le
// gabarit ; son producteur est tenu par `test/grooves.mjs`.

import fs from "node:fs";
import Handlebars from "handlebars";
import { range as cowboyRange } from "./.out/handlebarsHelpers/range.js";

Handlebars.registerHelper("localize", (key) => key);
Handlebars.registerHelper("eq", (left, right) => left === right);

const read = (path) =>
  fs.readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

Handlebars.registerPartial(
  "systems/cowboy-bebop/templates/partials/activation-editor.hbs",
  read("templates/partials/activation-editor.hbs")
);

let failures = 0;
const has = (label, html, pattern) => {
  if (pattern.test(html)) {
    console.log(`ok   ${label}`);
    return;
  }
  failures += 1;
  console.log(`FAIL ${label}`);
};
const hasNot = (label, html, pattern) => {
  if (!pattern.test(html)) {
    console.log(`ok   ${label}`);
    return;
  }
  failures += 1;
  console.log(`FAIL ${label}`);
};

// ========================================
// La feuille d'un groove
// ========================================

const sheet = Handlebars.compile(read("templates/sheets/item/item-sheet-groove.hbs"));

// Le clic sur « + » écrit dans `system.activations`. Le producteur de la
// fiche doit relire cette même liste au rendu suivant, sinon l'ajout réussit
// mais disparaît aussitôt de l'interface et le bouton paraît inerte.
const grooveEditorSource = read("ts/grooves.ts")
  .split("export function grooveEditor")[1]
  .split("// ========================================\n// Écritures")[0];
has(
  "la fiche relit les activations ajoutées",
  grooveEditorSource,
  /\bactivations\s*:/
);
// Un groove porte trois choses et seulement trois (ADR 0013) : le producteur
// doit en fournir exactement trois, et la feuille en dessiner exactement trois.
has("et sa substitution", grooveEditorSource, /\bsubstitution\s*:/);
has("et ses rappels", grooveEditorSource, /\breminders\s*:/);

// Loup solitaire : une substitution seule. C'est la forme de cinq des grooves du
// livre, et leurs activations sont vides.
const loneWolf = sheet({
  item: { name: "Loup solitaire", img: "icons/groove.webp" },
  groove: {
    audience: [
      { value: "chasseur", label: "Un chasseur", selected: true },
      { value: "prime", label: "Une prime", selected: false },
    ],
    description: "Les traits de Rock pour Blues et Jazz.",
    activations: [],
    substitution: {
      none: false,
      from: [
        { value: "rock", selected: true },
        { value: "blues", selected: false },
      ],
      to: [
        { value: "rock", checked: false, disabled: true },
        { value: "blues", checked: true, disabled: false },
        { value: "jazz", checked: true, disabled: false },
      ],
    },
    reminders: [],
  },
});

has("le public est un menu", loneWolf, /class="cowboy-groove-audience"/);
has("la source de la substitution est choisie", loneWolf, /value="rock"\s+selected/);
has("une cible cochée l'est", loneWolf, /value="blues"\s+checked/);
// Prêter une approche à elle-même n'ouvre rien : la case est fermée plutôt que
// jetée en silence à la lecture.
has("la source ne peut pas être sa propre cible", loneWolf, /value="rock"\s+disabled/);
has("aucune activation le dit", loneWolf, /COWBOY\.activation\.none/);
has("aucun rappel le dit", loneWolf, /COWBOY\.groove\.noReminder/);
// Les trois sections mortes de l'ADR 0013 ne doivent pas repousser : le prix et
// les effets vivent dans les Activations, et nulle part ailleurs.
hasNot("plus de règles de calcul", loneWolf, /cowboy-groove-rule/);
hasNot("plus de modulations", loneWolf, /cowboy-groove-modulation/);
hasNot("plus de prix à côté des activations", loneWolf, /cowboy-riff-payment-add/);

// Un groove de prime à rappel : quinze du livre n'ont que ça, et jusqu'ici
// aucune feuille ne savait les montrer.
const secretMission = sheet({
  item: { name: "Mission secrète", img: "icons/groove.webp" },
  groove: {
    audience: [{ value: "prime", label: "Une prime", selected: true }],
    description: "",
    activations: [],
    substitution: { none: true, from: [], to: [] },
    reminders: [
      {
        index: 0,
        text: "Ouvrez un cadran spécial de 4.",
        audiences: [
          { value: "bigshot", label: "Big Shot seul", selected: true },
          { value: "table", label: "Toute la table", selected: false },
        ],
      },
    ],
  },
});

has("le rappel est éditable", secretMission, /cowboy-groove-reminder-text[^>]*data-index="0"/);
has("et son texte est là", secretMission, /Ouvrez un cadran spécial de 4\./);
// Un rappel de prime lu par la table éventerait ce qu'il ne devait rappeler
// qu'à Big Shot : le public se règle rappel par rappel.
has("son public se règle", secretMission, /cowboy-groove-reminder-audience[\s\S]*?value="bigshot"\s+selected/);
has("et il se retire", secretMission, /cowboy-groove-reminder-remove[^>]*data-index="0"/);

// ========================================
// L'éditeur d'activations
// ========================================
//
// Le vocabulaire d'une activation est fermé — trois conditions, six paiements,
// treize effets, quatre durées — donc il se dessine. Ce que ce bloc tient est
// qu'aucun de ces quatre réglages n'est retombé dans le JSON à éditer à la main
// qui tenait cette place, et qu'un champ sait toujours quelle activation, quelle
// option et quel terme il commande.

const activationEditor = Handlebars.compile(
  read("templates/partials/activation-editor.hbs")
);

const editor = activationEditor({
  activations: [
    {
      target: "0",
      title: "Activation 1",
      invalid: false,
      json: "{}",
      conditions: [
        { value: "underDisadvantage", label: "sous désavantage", checked: true },
        { value: "sessionGenre", label: "genre de la session", checked: false },
      ],
      conditioned: true,
      // Une cartouche *ou* deux rythmes : deux options, dont une seule se paie.
      paymentOptions: [
        {
          index: 0,
          separated: false,
          payments: [{
            index: 0,
            amount: 1,
            options: [{ value: "cartridge", label: "cartouche", selected: true }],
          }],
        },
        {
          index: 1,
          separated: true,
          payments: [{
            index: 0,
            amount: 2,
            options: [{ value: "rythme", label: "rythme", selected: true }],
          }],
        },
      ],
      effects: [
        {
          index: 0,
          quantified: true,
          amount: -1,
          kinds: [{ value: "dice", label: "dés", selected: true }],
        },
        // Un effet booléen ne porte pas de montant : c'est ce que l'ADR 0012
        // solde, et un champ à zéro le réintroduirait dans le compendium.
        {
          index: 1,
          quantified: false,
          kinds: [{ value: "forbid", label: "interdire", selected: true }],
          targets: [{ value: "damageRemoval", label: "d'éliminer un dommage", selected: true }],
        },
        {
          index: 2,
          quantified: false,
          kinds: [{ value: "transformResult", label: "transformer", selected: true }],
          operations: [{ value: "rewriteDie", label: "réécrire une face", selected: true }],
        },
      ],
      scopes: [
        { value: "", label: "Instantanée", selected: false },
        { value: "mouvement", label: "Ce mouvement", selected: true },
      ],
      persistent: true,
      untilSecret: true,
      secret: false,
    },
    // Conservée pour réparation, mais entièrement bloquée.
    { target: "1", title: "Activation 2", invalid: true, error: "effects", json: '{"effects":"?"}' },
  ],
});

has("une condition cochée l'est", editor, /cowboy-activation-condition[^>]*value="underDisadvantage"[^>]*checked/);
has("et une autre reste offerte", editor, /cowboy-activation-condition[^>]*value="sessionGenre"(?![^>]*checked)/);
has("« ou » sépare les deux prix", editor, /cowboy-activation-or/);
has(
  "un paiement sait de quelle option il relève",
  editor,
  /cowboy-activation-payment-amount[^>]*data-target="0"[^>]*data-option="1"[^>]*data-payment="0"/
);
has("le prix se règle par menu", editor, /cowboy-activation-payment-resource[^>]*>[\s\S]*?value="rythme"\s+selected/);
has("un effet quantifié porte son montant", editor, /cowboy-activation-effect-amount[^>]*value="-1"/);
has("une interdiction dit ce qu'elle interdit", editor, /cowboy-activation-effect-target[\s\S]*?value="damageRemoval"\s+selected/);
has("une transformation dit ce qu'elle transforme", editor, /cowboy-activation-effect-operation[\s\S]*?value="rewriteDie"\s+selected/);
// L'ADR 0012 supprime le montant des effets booléens : la case ne doit pas
// revenir par le gabarit.
const booleanEffect = editor
  .split('<span class="cowboy-activation-effect">')[2] ?? "";
hasNot("un effet booléen n'offre pas de montant", booleanEffect, /cowboy-activation-effect-amount/);
has("la durée est un menu", editor, /cowboy-activation-scope[\s\S]*?value="mouvement"\s+selected/);
has("une activation persistante offre l'horloge du secret", editor, /cowboy-activation-until-secret[^>]*checked/);
has("et le drapeau secret", editor, /cowboy-activation-secret[^>]*data-target="0"/);
// Une activation invalide se répare là où elle a été écrite, et ne se dessine
// pas en formulaire : le faire jetterait sans le dire ce qu'on n'a pas su lire.
const broken = editor.split("Activation 2")[1];
has("une activation invalide dit pourquoi", broken, /notification error/);
has("et reste éditable telle quelle", broken, /cowboy-activation-json[^>]*data-target="1"/);
hasNot("sans formulaire trompeur", broken, /cowboy-activation-effect-add/);
// L'échappatoire du collage reste offerte sur une activation saine, repliée.
has("le texte brut reste accessible", editor, /<details class="cowboy-activation-raw">/);

const noActivation = activationEditor({ activations: [] });
has("aucune activation le dit", noActivation, /COWBOY\.activation\.none/);
has("et l'ajout reste offert", noActivation, /cowboy-activation-add/);

// ========================================
// La vignette sur une fiche d'acteur
// ========================================

const slot = Handlebars.compile(read("templates/partials/groove-slot.hbs"));

const filled = slot({ groove: { name: "Loup solitaire", description: "…" } });
has("la vignette nomme le groove", filled, /Loup solitaire/);
has("et permet de l'ouvrir", filled, /cowboy-groove-open/);
has("et de le retirer", filled, /cowboy-groove-remove/);

const empty = slot({});
has("une fiche sans groove invite au dépôt", empty, /COWBOY\.groove\.dropHint/);
hasNot("et n'offre rien à retirer", empty, /cowboy-groove-remove/);

// ========================================
// Les deux rappels
// ========================================
//
// Sept des onze grooves de chasseur se déclenchent au réglage, quatre après le
// jet : les deux rappels doivent donc exister, et nommer celui qu'un Jam ! prête.

const dialog = Handlebars.compile(read("templates/dialog/riff-play.hbs"));
const rappel = dialog({
  open: [],
  played: [],
  grooves: [
    { name: "Loup solitaire", description: "Rock pour Blues et Jazz.", lentBy: "" },
    { name: "Souvenir de guerre", description: "Blues pour Tango et Rock.", lentBy: "Groove prêté par Jet" },
  ],
  running: [
    { name: "Contrôle à distance", description: "Désavantage sur le genre." },
  ],
  totalLabel: "",
});
has("la boîte rappelle le groove du lanceur", rappel, /Loup solitaire/);
has("et celui qu'on lui prête", rappel, /Souvenir de guerre/);
has("en disant qui le prête", rappel, /Groove prêté par Jet/);
has("le groove prêté est distingué", rappel, /cowboy-dialog-groove is-lent/);
// Un groove se possède et ne se joue pas : rien à cliquer.
hasNot("aucun bouton de groove dans la boîte", rappel, /cowboy-groove-play/);
has("la boîte nomme l'activation en cours", rappel, /Contrôle à distance/);

const card = Handlebars.compile(read("templates/chat/roll.hbs"));
Handlebars.registerHelper("gt", (left, right) => left > right);
Handlebars.registerHelper("gte", (left, right) => left >= right);
Handlebars.registerHelper("or", (...values) => values.slice(0, -1).some(Boolean));
Handlebars.registerHelper("and", (...values) => values.slice(0, -1).every(Boolean));
// Le vrai helper et pas un bouchon : c'est lui qui dessine les cartons et les
// fausses notes, y compris dans l'historique, et un bouchon plus tolérant que
// la production laisserait passer exactement ce qui a cassé en partie.
Handlebars.registerHelper("cowboyRange", cowboyRange);
Handlebars.registerHelper("genreToIcon", () => "");

const carte = card({
  actor: { id: "spike" },
  result: { formula: "3d6", terms: [] },
  history: [
    {
      dice: [4, 3, 1],
      score: { total: 8, cartons: 0, notes: 1 },
      source: "Hors des sentiers battus",
    },
  ],
  resultDice: [
    { face: 4, discarded: false, rewritten: false },
    { face: 6, discarded: false, rewritten: true, from: 3 },
    { face: 2, discarded: true, rewritten: false },
  ],
  mouvement: { difficulty: 10, modifier: 0 },
  total: 12,
  notes: 1,
  carton: 1,
  category: "rock",
  genre: "jazz",
  traits: [],
  canCorrect: false,
  canStake: false,
  grooves: [
    {
      name: "Hors des sentiers battus",
      description: "Un 2-5 devient 6.",
      lentBy: "",
      actions: [
        { action: "rewrite-die", label: "Transformer un résultat en 6", icon: "fa-solid fa-wand-magic-sparkles" },
      ],
    },
  ],
  looseActions: [],
  running: [
    { name: "Contrôle à distance", description: "Désavantage sur le genre." },
  ],
});
has("la carte rappelle le groove après le jet", carte, /Hors des sentiers battus/);
has("avec son texte en infobulle", carte, /cowboy-roll-groove[\s\S]*?data-tooltip/);
has("la carte nomme l'activation appliquée", carte, /cowboy-roll-activation[\s\S]*?Contrôle à distance/);

// Le geste se range sous le badge qui l'ouvre, et un seul bouton l'ouvre : le
// dé se choisit ensuite dans une boîte, pas sur la carte.
has(
  "le geste du groove est un bouton sous son badge",
  carte,
  /Hors des sentiers battus[\s\S]*?cowboy-roll-groove-actions[\s\S]*?data-action="rewrite-die"/
);
has("qui sait sur quel acteur il agit", carte, /data-action="rewrite-die"[\s\S]*?data-actor-id="spike"/);

// Le groupement affiché vient de l'état, pas du jet : une face réécrite après
// coup n'existe que là, et le total juste à côté est compté sur elle.
has("la face réécrite est affichée, pas celle qui est tombée", carte, /cowboy-roll-rewritten-die/);
has("et rappelle ce qu'elle montrait", carte, /data-tooltip="3 → 6"/);
has("le dé écarté reste montré sans compter", carte, /roll die d6[\s\S]*?discarded/);

// Une étape dépassée se lit comme celle qui compte : des faces, pas une somme
// écrite, et ses jetons dessinés.
has("l'étape dépassée montre ses faces", carte, /cowboy-test-history-dice[\s\S]*?>1<[\s\S]*?<\/ol>/);
has("le 1 y est marqué comme ailleurs", carte, /cowboy-test-history-dice[\s\S]*?min[\s\S]*?<\/ol>/);
has("son total est barré", carte, /<s class="cowboy-test-history-total">8<\/s>/);
has("et sa fausse note dessinée", carte, /cowboy-test-history-total[\s\S]*?cowboy-note/);
has("ce qui l'a dépassée est nommé", carte, /cowboy-test-history-step[\s\S]*?Hors des sentiers battus/);
hasNot("plus de somme écrite à la main", carte, /3 \+ 4 \+ 5|4 \+ 3 \+ 1/);

// Joué, le geste reste sur la carte plutôt que de disparaître : l'étape barrée
// au-dessus dit qu'on s'en est servi, le bouton grisé dit qu'on ne peut plus.
const epuise = card({
  actor: { id: "spike" },
  result: { formula: "3d6", terms: [] },
  resultDice: [],
  mouvement: { difficulty: 10, modifier: 0 },
  total: 12,
  traits: [],
  grooves: [
    {
      name: "Hors des sentiers battus",
      description: "Un 2-5 devient 6.",
      lentBy: "",
      actions: [
        {
          action: "rewrite-die",
          label: "Transformer un résultat en 6",
          icon: "fa-solid fa-wand-magic-sparkles",
          blocked: "Déjà joué sur ce Test.",
        },
      ],
    },
  ],
  looseActions: [],
});
has("le geste joué reste offert", epuise, /data-action="rewrite-die"/);
has("mais grisé", epuise, /data-action="rewrite-die"[\s\S]*?disabled/);
has("avec son motif", epuise, /Déjà joué sur ce Test\./);

// Ouvert par un riff plutôt que par un groove, le même geste n'a pas de badge
// sous lequel se ranger : il reste offert, dessous.
const jam = card({
  actor: { id: "spike" },
  result: { formula: "3d6", terms: [] },
  mouvement: { difficulty: 10, modifier: 0 },
  total: 12,
  traits: [],
  grooves: [],
  looseActions: [
    { action: "reserve-plan", label: "Réserver un résultat", icon: "fa-solid fa-calendar-plus" },
  ],
});
has("un geste sans badge reste offert", jam, /data-action="reserve-plan"/);

// Une Activation en cours est nommée partout où elle agit : c'est ce qui tient
// lieu de journal (ADR 0012).
const activationList = Handlebars.compile(read("templates/partials/activation-list.hbs"));
const active = activationList({
  running: [{
    name: "Raid spécial",
    description: "Des fausses notes hors genre.",
    conditionLabel: "hors genre de session",
    scopeLabel: "Ce mouvement",
  }],
});
has("une fiche nomme l'activation en cours", active, /Raid spécial/);
has("et rend sa portée lisible", active, /hors genre de session · \s*Ce mouvement/);

// Une activation sans condition n'en montre que la moitié, et c'est juste.
const unconditional = activationList({
  running: [{ name: "Vue du dernier étage", description: "…", conditionLabel: "", scopeLabel: "Cette session" }],
});
has("sans condition, la portée seule", unconditional, /Cette session/);
hasNot("et pas de séparateur orphelin", unconditional, /·/);

console.log(failures === 0 ? "\ntout passe" : `\n${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
