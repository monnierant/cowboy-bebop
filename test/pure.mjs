// Ce que le livre dit d'un test, vérifié sans Foundry.
//
// Tout ce qui décide d'un score vit dans `src/ts/rolls/score.ts`, qui ne connaît
// ni `Roll`, ni `game`, ni le DOM : c'est ce qui permet de le tenir ici, ligne à
// ligne du chapitre 1. Ce fichier est le contrat - un jet dont le score change
// sans qu'une de ces lignes change est une régression.

import {
  MAX_CARTONS,
  MAX_CORRECTIONS,
  canCorrect,
  correct,
  dicePool,
  keptDice,
  MIN_DICE,
  readAdvantage,
  score,
  withDifficulty,
} from "./.out/rolls/score.js";

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

// Les trois mouvements du livre, recopiés ici plutôt qu'importés de
// `constants.ts` : celui-ci lit `system.json` et n'est donc pas pur. Le prix est
// une duplication de six nombres, le gain est que ces tests disent aussi ce que
// les mouvements valent, au lieu de se contenter de suivre.
const OK = { dices: 1, difficulty: 5, notes: 1 };
const TROIS_DEUX_UN = { dices: 2, difficulty: 10, notes: 1 };
const LETS_JAM = { dices: 3, difficulty: 15, notes: 2 };

const pool = (mouvement, traits, genreBonus, advantage) =>
  dicePool({ mouvement, traits, genreBonus, advantage });

// ==========================================================================
// CONSTITUER LE GROUPEMENT DE DÉS
// ==========================================================================

// « Un nombre de dés égal au rang du mouvement en cours (un dé pour le premier,
// deux pour le deuxième, etc.) »
check("rang 1 seul", pool(OK, 0, false, 0).formula, "1d6");
check("rang 2 seul", pool(TROIS_DEUX_UN, 0, false, 0).formula, "2d6");
check("rang 3 seul", pool(LETS_JAM, 0, false, 0).formula, "3d6");

// « Un dé supplémentaire par trait issu de l'approche choisie et utilisé dans la
// description de la fiction. Parfois, le CP n'a aucun trait à utiliser »
check("aucun trait n'ajoute rien", pool(OK, 0, false, 0).dice, 1);
check("un trait ajoute un dé", pool(OK, 1, false, 0).dice, 2);
check("trois traits ajoutent trois dés", pool(OK, 3, false, 0).dice, 4);

// « Un dé supplémentaire si le personnage utilise l'approche correspondant au
// genre de la session »
check("le genre de la session ajoute un dé", pool(OK, 0, true, 0).dice, 2);
check("hors genre, rien de plus", pool(OK, 0, false, 0).dice, 1);

// Les trois sources s'additionnent : dernier mouvement, deux traits, bon genre.
check("rang 3 + 2 traits + genre", pool(LETS_JAM, 2, true, 0).formula, "6d6");

// Les dés qu'un riff ajoute par-dessus. « Il ignore alors complètement le
// premier jet et relance son groupement en y ajoutant un dé. »
const withBonus = (mouvement, traits, bonusDice) =>
  dicePool({ mouvement, traits, genreBonus: false, advantage: 0, bonusDice });
check("un riff ajoute son dé", withBonus(TROIS_DEUX_UN, 2, 1).formula, "5d6");
check("deux dés pour S'impliquer", withBonus(TROIS_DEUX_UN, 0, 2).formula, "4d6");
check("aucun riff n'ajoute rien", withBonus(TROIS_DEUX_UN, 0, 0).formula, "2d6");
check("un riff absent n'ajoute rien", pool(TROIS_DEUX_UN, 0, false, 0).formula, "2d6");

// Le compteur libre de la boîte de jet peut aussi retirer des dés. Un test sans
// dé n'est pas un test, et `0d6` n'est pas une formule : on plancher à un.
check("des dés en moins", withBonus(LETS_JAM, 0, -1).formula, "2d6");
check("le groupement ne tombe pas à zéro", withBonus(TROIS_DEUX_UN, 0, -2).formula, "1d6");
check("ni ne passe en négatif", withBonus(TROIS_DEUX_UN, 0, -9).formula, "1d6");
check("le plancher vaut un dé", MIN_DICE, 1);

// ==========================================================================
// AVANTAGE ET DÉSAVANTAGE
// ==========================================================================

// « L'avantage implique de lancer un dé supplémentaire et de retirer l'un des
// dés au résultat le plus faible. »
check("avantage : un dé de plus", pool(TROIS_DEUX_UN, 0, false, 1).dice, 3);
check("avantage : retire le plus faible", pool(TROIS_DEUX_UN, 0, false, 1).modifier, "dl");
check("avantage : formule", pool(TROIS_DEUX_UN, 0, false, 1).formula, "3d6dl");

// « Le désavantage, quant à lui, signifie que le CP lance un dé supplémentaire,
// mais retire l'un des dés au résultat le plus élevé. »
check("désavantage : un dé de plus", pool(TROIS_DEUX_UN, 0, false, -1).dice, 3);
check("désavantage : retire le plus élevé", pool(TROIS_DEUX_UN, 0, false, -1).modifier, "dh");
check("désavantage : formule", pool(TROIS_DEUX_UN, 0, false, -1).formula, "3d6dh");

// Ni l'un ni l'autre : aucun dé de plus, et surtout aucun suffixe dans la
// formule - `2d6d` n'est pas la même chose que `2d6`.
check("ni avantage ni désavantage", pool(TROIS_DEUX_UN, 0, false, 0).modifier, "");
check("formule nue sans modificateur", pool(TROIS_DEUX_UN, 0, false, 0).formula, "2d6");

// « Il n'est pas possible de bénéficier de plusieurs avantages ou de subir
// plusieurs désavantages » : deux avantages ne font qu'un.
check("deux avantages ne cumulent pas", pool(TROIS_DEUX_UN, 0, false, 2), pool(TROIS_DEUX_UN, 0, false, 1));
check("trois désavantages ne cumulent pas", pool(TROIS_DEUX_UN, 0, false, -3), pool(TROIS_DEUX_UN, 0, false, -1));

// Le menu déroulant rend une chaîne, pas un nombre.
check("l'avantage lu depuis un select", readAdvantage("1"), 1);
check("le désavantage lu depuis un select", readAdvantage("-1"), -1);
check("aucun modificateur lu depuis un select", readAdvantage("0"), 0);

// Un champ absent ou illisible vaut « pas de modificateur », jamais NaN : un
// NaN se propage jusque dans la formule et casse le jet entier.
check("avantage illisible", readAdvantage("bonjour"), 0);
check("avantage absent", readAdvantage(undefined), 0);
check("avantage nul", readAdvantage(null), 0);
check("avantage vide", readAdvantage(""), 0);
check("avantage NaN", readAdvantage(NaN), 0);
check("un avantage illisible ne casse pas la formule", pool(OK, 0, false, "bonjour").formula, "1d6");

// ==========================================================================
// MODIFIER LA DIFFICULTÉ
// ==========================================================================

// « Modifier de 1 la difficulté du mouvement pour les prochains tests. Chaque
// carton la réduit, chaque fausse note l'augmente. »
check("une fausse note durcit le seuil", withDifficulty(TROIS_DEUX_UN, 1).difficulty, 11);
check("un carton adoucit le seuil", withDifficulty(TROIS_DEUX_UN, -1).difficulty, 9);
check("plusieurs cartons se cumulent", withDifficulty(LETS_JAM, -4).difficulty, 11);
check("sans écart, le seuil du livre", withDifficulty(OK, 0).difficulty, 5);
check("l'écart voyage avec le mouvement", withDifficulty(OK, -2).modifier, -2);

// Le reste du mouvement traverse intact : c'est le même mouvement, à son seuil
// près, et le compte des fausses notes par défaut ne bouge pas avec lui.
check("le rang ne bouge pas", withDifficulty(LETS_JAM, 3).dices, 3);
check("le plancher de fausses notes ne bouge pas", withDifficulty(LETS_JAM, 3).notes, 2);

// Le plancher est à 1 et porte sur la lecture, jamais sur l'Offset (ADR 0015) :
// un seuil de zéro serait acquis d'office. Un écart illisible ne corrige rien.
check("le seuil ne passe pas sous un", withDifficulty(OK, -12).difficulty, 1);
check("le seuil plancher reste franchissable", score([1], withDifficulty(OK, -12)).cartons, 1);
check("un écart illisible ne corrige rien", withDifficulty(OK, "bonjour").difficulty, 5);
check("un écart absent ne corrige rien", withDifficulty(OK, undefined).difficulty, 5);

// Le seuil corrigé est bien celui que les cartons lisent.
check("le carton se compte sur le seuil corrigé", score([4, 4], withDifficulty(TROIS_DEUX_UN, -2)).cartons, 1);
check("un seuil durci refuse le carton", score([5, 5], withDifficulty(TROIS_DEUX_UN, 1)).cartons, 0);

// ==========================================================================
// LES DÉS QUI COMPTENT
// ==========================================================================

// Le dé retiré par un avantage sort du groupement : il ne compte ni dans la
// somme, ni dans les 6, ni dans les 1.
check(
  "seuls les dés actifs sont gardés",
  keptDice([{ results: [{ result: 6, active: true }, { result: 1, active: false, discarded: true }] }]),
  [6]
);
check(
  "plusieurs termes sont mis bout à bout",
  keptDice([
    { results: [{ result: 3, active: true }] },
    { results: [{ result: 4, active: true }] },
  ]),
  [3, 4]
);
check("un jet sans terme ne garde rien", keptDice([]), []);
check("des termes absents ne gardent rien", keptDice(undefined), []);
check(
  "un terme sans résultats est ignoré",
  keptDice([{}, { results: [{ result: 2, active: true }] }]),
  [2]
);

// ==========================================================================
// CARTONS
// ==========================================================================

// « Un si la somme des résultats égale ou surpasse la difficulté du mouvement »
check("sous la difficulté, aucun carton", score([1, 2], TROIS_DEUX_UN).cartons, 0);
check("la difficulté pile est un carton", score([5, 5], TROIS_DEUX_UN).cartons, 1);
check("au-dessus de la difficulté, un carton", score([5, 6], TROIS_DEUX_UN).cartons, 1);
check("la somme est celle des dés gardés", score([5, 6], TROIS_DEUX_UN).total, 11);
check("un groupement vide totalise zéro", score([], OK), { total: 0, cartons: 0, notes: 1 });

// « Un si le CP récolte au moins deux 6 »
check("deux 6 sous la difficulté valent un carton", score([6, 6, 2], LETS_JAM).cartons, 1);
check("un seul 6 ne donne pas ce carton", score([6, 3], TROIS_DEUX_UN).cartons, 0);
check("trois 6 ne valent toujours qu'un carton de plus", score([6, 6, 6], LETS_JAM).cartons, 2);

// Les deux ensemble : c'est le maximum, « jusqu'à deux cartons ».
check("difficulté franchie et deux 6", score([6, 6, 5], LETS_JAM).cartons, 2);
check("jamais plus de deux cartons", MAX_CARTONS, 2);
check("quatre 6 restent à deux cartons", score([6, 6, 6, 6], LETS_JAM).cartons, 2);

// ==========================================================================
// FAUSSES NOTES
// ==========================================================================

// « Le test produit aussi une fausse note par 1 obtenu lors du jet de dés. »
check("un 1 fait une fausse note", score([1, 6, 6], LETS_JAM).notes, 1);
check("trois 1 font trois fausses notes", score([1, 1, 1], LETS_JAM).notes, 3);

// « Si aucune fausse note n'a été obtenue, le CP en fait une (ou deux au cours
// du dernier mouvement). »
check("aucun 1 au premier mouvement", score([5], OK).notes, 1);
check("aucun 1 au deuxième mouvement", score([5, 5], TROIS_DEUX_UN).notes, 1);
check("aucun 1 au dernier mouvement", score([5, 5, 5], LETS_JAM).notes, 2);

// Le plancher du dernier mouvement ne s'applique que si le jet n'a rien produit :
// un seul 1 au dernier mouvement reste une seule fausse note.
check("un seul 1 au dernier mouvement", score([1, 6, 6], LETS_JAM).notes, 1);
check("deux 1 au dernier mouvement", score([1, 1, 6], LETS_JAM).notes, 2);

// Un carton et des fausses notes cohabitent : réussir n'efface rien.
check("réussite et fausse note ensemble", score([1, 6, 6, 6], LETS_JAM), {
  total: 19,
  cartons: 2,
  notes: 1,
});

// ==========================================================================
// CORRIGER LES FAUSSES NOTES
// ==========================================================================

// « Le CP peut alors retirer jusqu'à deux fausses notes. »
check("deux corrections au maximum", MAX_CORRECTIONS, 2);
check("rien de corrigé, on peut corriger", canCorrect({ notes: 3, corrected: 0 }), true);
check("une correction faite, on peut encore", canCorrect({ notes: 2, corrected: 1 }), true);
check("deux corrections faites, on s'arrête", canCorrect({ notes: 1, corrected: 2 }), false);

// « Big Shot récupère toute fausse note restante » : ce qui reste après deux
// corrections reste, il ne se corrige pas.
check("première correction", correct({ notes: 3, corrected: 0 }), { notes: 2, corrected: 1 });
check("deuxième correction", correct({ notes: 2, corrected: 1 }), { notes: 1, corrected: 2 });
check("troisième correction refusée", correct({ notes: 1, corrected: 2 }), { notes: 1, corrected: 2 });

// Plancher à zéro : sans fausse note à retirer, il n'y a rien à corriger, et
// surtout pas de fausse note négative - un état qu'aucune carte ne sait montrer.
check("aucune fausse note à corriger", canCorrect({ notes: 0, corrected: 0 }), false);
check("corriger le vide ne fait rien", correct({ notes: 0, corrected: 0 }), { notes: 0, corrected: 0 });
check(
  "la dernière fausse note n'entame pas la suivante",
  correct(correct({ notes: 1, corrected: 0 })),
  { notes: 0, corrected: 1 }
);

// ==========================================================================

if (failures > 0) {
  console.log(`\n${failures} test(s) en échec`);
  process.exit(1);
}
console.log("\ntout passe");
