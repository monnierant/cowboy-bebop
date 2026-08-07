// Où vont les jetons d'un test, vérifié sans Foundry.
//
// La boîte de collecte ne décide rien elle-même : elle affiche un plan et joue
// des gestes dessus. Ce fichier est le contrat de ces gestes - ce qu'ils
// coûtent, ce qu'ils déplacent sur le seuil, et ce qui les barre (ADR 0015).

import {
  gestureBlocked,
  offeredGestures,
  openPlan,
  play,
  untouched,
} from "./.out/rolls/collectPlan.js";

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

const offer = (over = {}) => ({
  cartons: 2,
  notes: 2,
  genre: "jazz",
  offset: 0,
  forbidden: false,
  relief: false,
  masterKey: false,
  ...over,
});

// Passe-partout sur la table : le seul Groove qui ouvre le rachat.
const withKey = (over = {}) => offer({ masterKey: true, ...over });

// ==========================================================================
// LE PLAN DE DÉPART
// ==========================================================================
//
// Tant que personne n'a rien fait, la collecte rend exactement ce que le test a
// produit : la boîte n'est pas un péage, c'est une occasion.

check("tout part à la collecte", openPlan(offer()).cartons, 2);
check("les fausses notes aussi", openPlan(offer()).notes, 2);
check("le seuil ne bouge pas", openPlan(offer({ offset: 3 })).offset, 3);
check("rien n'a été touché", untouched(openPlan(offer()), offer()), true);

// ==========================================================================
// DÉPENSER CONTRE LE SEUIL
// ==========================================================================

const spentCarton = play(openPlan(offer()), offer(), "spend-carton");
check("un carton de moins à collecter", spentCarton.cartons, 1);
check("et le seuil baisse de 1", spentCarton.offset, -1);
check("les fausses notes ne bougent pas", spentCarton.notes, 2);
check("la boîte a touché au résultat", untouched(spentCarton, offer()), false);

const spentNote = play(openPlan(offer()), offer(), "spend-note");
check("une fausse note de moins à collecter", spentNote.notes, 1);
check("et le seuil monte de 1", spentNote.offset, 1);

// Les gestes s'empilent, et le seuil suit : deux cartons valent −2.
const twice = play(spentCarton, offer(), "spend-carton");
check("deux cartons, deux crans", twice.offset, -2);
check("il ne reste rien à créditer", twice.cartons, 0);
check("et plus rien à dépenser", gestureBlocked(twice, offer(), "spend-carton"), "COWBOY.difficulty.noCarton");

// Un test sans fausse note ne propose pas d'en dépenser.
const clean = offer({ notes: 0 });
check("aucune fausse note à dépenser", gestureBlocked(openPlan(clean), clean, "spend-note"), "COWBOY.difficulty.noNote");

// ==========================================================================
// L'INTERDICTION DE VUE DU DERNIER ÉTAGE, ET LE DROIT DU SOLO !
// ==========================================================================
//
// Le groove éteint le carton contre le seuil, « sauf s'ils jouent un Solo ! ».
// Le droit ouvert par le Solo ! lève l'interdiction une fois, et se consomme là
// - sans interdiction à lever, il reste intact pour le test où il servira.

const forbidden = offer({ forbidden: true });
check("le groove barre le carton", gestureBlocked(openPlan(forbidden), forbidden, "spend-carton"), "COWBOY.difficulty.forbidden");
check("et le geste ne fait rien", play(openPlan(forbidden), forbidden, "spend-carton"), openPlan(forbidden));
check("la fausse note, elle, passe", gestureBlocked(openPlan(forbidden), forbidden, "spend-note"), undefined);

const relieved = offer({ forbidden: true, relief: true });
const usedRelief = play(openPlan(relieved), relieved, "spend-carton");
check("le Solo ! ouvre la dépense", usedRelief.offset, -1);
check("et son droit est consommé", usedRelief.reliefUsed, true);
check("le second carton retombe sous l'interdiction", gestureBlocked(usedRelief, relieved, "spend-carton"), "COWBOY.difficulty.forbidden");

// Sans interdiction, dépenser un carton n'entame pas le droit.
const spared = offer({ relief: true });
check("le droit reste ouvert", play(openPlan(spared), spared, "spend-carton").reliefUsed, false);

// ==========================================================================
// LE RACHAT DE PASSE-PARTOUT
// ==========================================================================
//
// « Les CP peuvent annuler l'augmentation en dépensant deux cartons » : l'écart
// entier tombe, y compris la part que les chasseurs avaient eux-mêmes achetée.
// Ce n'est pas une règle générale de l'économie mais le mécanisme spécial de ce
// Groove-là : sans lui sur la table, le geste n'est même pas proposé.

check("sans Passe-partout, deux gestes", offeredGestures(offer()), ["spend-carton", "spend-note"]);
check("avec lui, le rachat s'ajoute", offeredGestures(withKey()), ["spend-carton", "spend-note", "buy-back"]);

const noKey = offer({ offset: 3 });
check("et le rachat reste barré", gestureBlocked(openPlan(noKey), noKey, "buy-back"), "COWBOY.difficulty.noMasterKey");
check("même appelé de force, il ne fait rien", play(openPlan(noKey), noKey, "buy-back"), openPlan(noKey));

const raised = withKey({ offset: 3 });
const boughtBack = play(openPlan(raised), raised, "buy-back");
check("le rachat coûte les deux cartons", boughtBack.cartons, 0);
check("et remet le seuil à zéro", boughtBack.offset, 0);
check("il est consigné", boughtBack.boughtBack, true);

// Un écart nul n'a rien à racheter, et un seul carton ne paie pas.
check("rien à racheter", gestureBlocked(openPlan(withKey()), withKey(), "buy-back"), "COWBOY.difficulty.noOffset");
const single = withKey({ cartons: 1, offset: 3 });
check("un carton ne suffit pas", gestureBlocked(openPlan(single), single, "buy-back"), "COWBOY.difficulty.needTwoCartons");

// L'écart est porté en valeur : ce qu'on dépense après un rachat repart de zéro.
check("après le rachat, la fausse note repart de zéro", play(boughtBack, raised, "spend-note").offset, 1);

// Le rachat d'un écart que les fausses notes ont creusé se lit de même : elles
// l'ont monté, deux cartons le rendent.
const afterNote = play(openPlan(withKey()), withKey(), "spend-note");
check("la fausse note ouvre le rachat", gestureBlocked(afterNote, withKey(), "buy-back"), undefined);
check("et le rachat l'annule", play(afterNote, withKey(), "buy-back").offset, 0);

// ==========================================================================

if (failures > 0) {
  console.log(`\n${failures} test(s) en échec`);
  process.exit(1);
}
console.log("\ntout passe");
