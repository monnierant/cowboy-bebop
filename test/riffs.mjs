// Ce que le vocabulaire des riffs promet, vérifié sans Foundry.
//
// Les prix et les effets sont écrits par Big Shot dans un éditeur, donc ce qui
// arrive ici est du texte quelconque venu d'un document. La moitié de ce
// fichier tient la normalisation : ce qu'on accepte, ce qu'on jette, et ce
// qu'on rectifie. L'autre moitié tient les deux règles qui ont une conséquence
// à la table - à quelle phase un riff se joue, et ce que ses effets cumulent.

import {
  EFFECT_PHASE,
  activationPhase,
  cardEffects,
  effectKinds,
  isCounter,
  isFree,
  normalizeEffects,
  normalizePayments,
  paymentResources,
  rollEffects,
} from "./.out/rolls/activationTerms.js";

import { addCartons, addNotes, logRiff, openTest } from "./.out/rolls/testState.js";

let failures = 0;
const check = (label, actual, expected) => {
  const okay = JSON.stringify(actual) === JSON.stringify(expected);
  if (!okay) {
    failures += 1;
    console.log(
      `FAIL ${label}\n  got      ${JSON.stringify(actual)}\n  expected ${JSON.stringify(expected)}`
    );
  } else {
    console.log(`ok   ${label}`);
  }
};

// ========================================
// Les deux vocabulaires sont fermés
// ========================================

check("six paiements, pas un de plus", paymentResources.length, 6);
// Les sept de l'ADR 0008, plus les quatre de l'ADR 0011 réparties, plus les
// deux primitives de l'ADR 0012 — interdire et transformer. Treize, et une
// entrée de plus demande son propre ADR.
check("treize effets", effectKinds.length, 13);
check(
  "chaque effet a une phase",
  effectKinds.every((kind) => EFFECT_PHASE[kind] !== undefined),
  true
);

check("une cartouche est un compteur", isCounter("cartridge"), true);
check("un rythme aussi", isCounter("rythme"), true);
check("un risque aussi", isCounter("risque"), true);
// Ceux-là se prennent sur le test, pas sur une fiche : rien à griser d'avance.
check("un trait entamé n'en est pas un", isCounter("dentTrait"), false);
check("un trait misé non plus", isCounter("stakeTrait"), false);
check("une fausse note non plus", isCounter("note"), false);

// ========================================
// Ce que Big Shot écrit, ramené à du jouable
// ========================================

check(
  "une ressource inconnue disparaît",
  normalizePayments([{ resource: "gloire", amount: 1 }]),
  []
);
check(
  "un effet inconnu disparaît",
  normalizeEffects([{ kind: "teleport", amount: 1 }]),
  []
);
check("ce qui n'est pas une liste vaut rien", normalizePayments("cartouche"), []);
check("absent aussi", normalizeEffects(undefined), []);

// Une quantité illisible vaut un, jamais zéro : un paiement à zéro serait un
// riff gratuit déguisé, et un effet à zéro un bouton qui ne fait rien.
check(
  "une quantité illisible vaut un",
  normalizePayments([{ resource: "rythme", amount: "beaucoup" }]),
  [{ resource: "rythme", amount: 1 }]
);
check(
  "zéro aussi",
  normalizeEffects([{ kind: "dice", amount: 0 }]),
  [{ kind: "dice", amount: 1 }]
);
check(
  "un prix négatif se redresse",
  normalizePayments([{ resource: "cartridge", amount: -2 }]),
  [{ resource: "cartridge", amount: 2 }]
);
// Un effet négatif, lui, se garde : c'est ce qu'est un désavantage, et ce que
// Big Shot retire de dés au jugé.
check(
  "un effet négatif se garde",
  normalizeEffects([{ kind: "advantage", amount: -1 }]),
  [{ kind: "advantage", amount: -1 }]
);

// ========================================
// La phase se déduit, elle ne se règle pas
// ========================================
//
// Un riff porte une Activation comme un groove (ADR 0012) : la phase se lit
// donc sur ses effets, exactement comme avant, et sans qu'un riff ait à la dire.

const riff = (options, effects) => ({
  conditions: [],
  paymentOptions: options,
  effects,
});

check(
  "des dés se jouent au lancer",
  activationPhase(riff([], [{ kind: "dice", amount: 2 }])),
  "roll"
);
check(
  "un carton se joue sur la carte",
  activationPhase(riff([], [{ kind: "cartons", amount: 1 }])),
  "card"
);
// On ne peut pas être aux deux endroits, et c'est le résultat qui décide
// puisque c'est lui que l'effet touche.
check(
  "un riff mixte se joue sur la carte",
  activationPhase(
    riff([], [
      { kind: "dice", amount: 1 },
      { kind: "notes", amount: 1 },
    ])
  ),
  "card"
);
check("un riff sans effet se joue au lancer", activationPhase(riff([], [])), "roll");
check(
  "une phase dite l'emporte sur la déduction",
  activationPhase(riff([], [{ kind: "dice", amount: 2 }]), "sheet"),
  "sheet"
);

check("un riff sans paiement est gratuit", isFree(riff([], [])), true);
check(
  "un riff avec paiement ne l'est pas",
  isFree(riff([[{ resource: "rythme", amount: 1 }]], [])),
  false
);
// Une option vide au milieu d'autres est ce qui rend un riff gratuit *au choix*
// — et c'est pour ça que l'éditeur n'en propose jamais une par le bouton.
check(
  "une option vide suffit à le rendre gratuit",
  isFree(riff([[{ resource: "rythme", amount: 1 }], []], [])),
  true
);

// ========================================
// Les effets se cumulent
// ========================================

check(
  "deux S'impliquer font quatre dés",
  rollEffects([
    { kind: "dice", amount: 2 },
    { kind: "dice", amount: 2 },
  ]).dice,
  4
);
check(
  "l'avantage n'est pas borné ici",
  rollEffects([
    { kind: "advantage", amount: 1 },
    { kind: "advantage", amount: 1 },
  ]).advantage,
  2
);
check(
  "un avantage et un désavantage s'annulent",
  rollEffects([
    { kind: "advantage", amount: 1 },
    { kind: "advantage", amount: -1 },
  ]).advantage,
  0
);
check(
  "Montrer ses blessures efface deux dommages",
  rollEffects([{ kind: "heal", amount: 2 }]).heal,
  2
);
check(
  "Improviser ouvre une approche",
  rollEffects([{ kind: "approach", amount: 1 }]).approach,
  1
);
check(
  "les jetons ne comptent pas au lancer",
  rollEffects([{ kind: "cartons", amount: 1 }]).dice,
  0
);
check(
  "une double fausse note en pose deux",
  cardEffects([{ kind: "notes", amount: 2 }]),
  { cartons: 0, notes: 2 }
);

// ========================================
// Forcer et les fausses notes de Big Shot
// ========================================

const TROIS_DEUX_UN = {
  name: "3, 2, 1…",
  dices: 2,
  difficulty: 10,
  notes: 1,
  modifier: 0,
};

const fresh = () =>
  openTest({
    actorId: "spike",
    genre: "jazz",
    category: "rock",
    mouvementIndex: 1,
    mouvement: TROIS_DEUX_UN,
    advantage: 0,
    traits: [],
  });

const scored = (cartons, notes) => {
  const state = fresh();
  return { ...state, score: { total: 12, cartons, notes } };
};

// « S'il n'a pas obtenu le maximum de deux cartons. » La garde du livre n'est
// écrite nulle part : elle tombe du plafond de `score()`.
check("Forcer depuis zéro donne un carton", addCartons(scored(0, 1), 1).score.cartons, 1);
check("puis un second", addCartons(scored(1, 3), 1).score.cartons, 2);
const maxed = scored(2, 1);
check("à deux cartons, rien ne bouge", addCartons(maxed, 1) === maxed, true);

check("Forcer déclenche deux fausses notes", addNotes(scored(0, 1), 2).score.notes, 3);
check("le risque de Big Shot en pose une", addNotes(scored(1, 0), 1).score.notes, 1);
const nothing = scored(1, 2);
check("ajouter zéro ne réécrit rien", addNotes(nothing, 0) === nothing, true);

// Un test soldé a rendu ses jetons : plus rien ne s'y pose.
const settled = { ...scored(1, 1), settled: true };
check("un test soldé ne prend plus de carton", addCartons(settled, 1) === settled, true);
check("ni de fausse note", addNotes(settled, 1) === settled, true);

// ========================================
// Ce qui a été joué ne se reprend pas
// ========================================

const played = logRiff(
  logRiff(fresh(), { id: "involve", name: "S'impliquer", payment: { resource: "cartridge", amount: 1 } }),
  { id: "improvise", name: "Improviser", payment: { resource: "rythme", amount: 1 } }
);
check("les riffs joués s'empilent dans l'ordre", played.played.map((riff) => riff.id), [
  "involve",
  "improvise",
]);
check("un test neuf n'a rien joué", fresh().played, []);

console.log(failures === 0 ? "\ntout passe" : `\n${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
