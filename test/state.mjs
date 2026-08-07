// Ce qu'un test devient entre son lancer et sa collecte, vérifié sans Foundry.
//
// L'état d'un test vit sur son message de chat, et toutes les transitions qui le
// font bouger sont pures : c'est ce qui permet de les tenir ici. Ce fichier est
// le contrat de la Carte - qui peut corriger, combien de fois, ce qu'un pari
// coûte, et ce que le groupement vaut à chaque instant.

import {
  cardTraits,
  canCorrect,
  correctByCartridge,
  correctByTrait,
  openTest,
  applyDice,
  poolOf,
  rerollPool,
  resolveReroll,
  settle,
  stakeableTraits,
  usableTraits,
} from "./.out/rolls/testState.js";

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

const TROIS_DEUX_UN = {
  name: "3, 2, 1…",
  dices: 2,
  difficulty: 10,
  notes: 1,
  modifier: 0,
};

const trait = (key, source = "hunter") => ({
  key,
  name: key,
  source,
  category: "rock",
  index: 0,
  monoUuid: "",
});

// Un test de rock au deuxième mouvement, hors genre de session, deux traits
// cochés : deux dés de mouvement plus deux de traits.
const opened = (traits = [trait("A"), trait("B")]) =>
  openTest({
    actorId: "spike",
    genre: "jazz",
    category: "rock",
    mouvementIndex: 1,
    mouvement: TROIS_DEUX_UN,
    advantage: 0,
    traits,
  });

const keys = (traits) => traits.map((t) => t.key);
const states = (state) => state.traits.map((t) => `${t.key}:${t.state}`);

// ==========================================================================
// UN TEST QUI S'OUVRE
// ==========================================================================

check("les traits partent utilisables", states(opened()), ["A:usable", "B:usable"]);
check("rien n'est encore corrigé", opened().corrected, 0);
check("rien n'est encore relancé", opened().rerolled, false);
check("rien n'est encore soldé", opened().settled, false);
check("un ancien test n'a aucune activation en cours", opened().running, []);
// Gelées avec le nom du groove qui les a posées : modifier le groove ensuite ne
// doit pas réécrire ce que la carte raconte.
check(
  "les activations en cours du lancer sont gelées",
  openTest({
    ...opened(),
    running: [{
      grooveId: "controle",
      name: "Contrôle à distance",
      description: "…",
      conditions: [{ kind: "sessionGenre" }],
      paymentOptions: [],
      effects: [{ kind: "advantage", amount: -1 }],
      scope: "mouvement",
    }],
  }).running?.[0]?.name,
  "Contrôle à distance"
);
check("le groupement d'ouverture", poolOf(opened()).formula, "4d6");

// Le dé du genre de la session s'ajoute quand l'approche est la sienne.
check(
  "l'approche du genre ajoute son dé",
  poolOf({ ...opened(), genre: "rock" }).formula,
  "5d6"
);

// Les dés comptés à la main dans la boîte de jet : ce que S'impliquer donne,
// ou ce que Big Shot accorde au jugé.
check("aucun dé ajouté par défaut", opened().bonusDice, 0);
check("deux dés ajoutés à la main", poolOf({ ...opened(), bonusDice: 2 }).formula, "6d6");
check("un dé retiré à la main", poolOf({ ...opened(), bonusDice: -1 }).formula, "3d6");
// Une carte écrite avant que ce compteur existe n'a pas le champ du tout.
check("un compteur absent vaut zéro", poolOf({ ...opened(), bonusDice: undefined }).formula, "4d6");

// ==========================================================================
// LE JET
// ==========================================================================

const rolled = applyDice(opened(), [1, 1, 4, 4]);
check("la somme du jet", rolled.score.total, 10);
check("le carton du seuil", rolled.score.cartons, 1);
check("une fausse note par 1", rolled.score.notes, 2);
check("relancer un jet ne touche pas aux traits", states(rolled), ["A:usable", "B:usable"]);

// ==========================================================================
// CORRIGER
// ==========================================================================

// « Le CP peut alors retirer jusqu'à deux fausses notes. »
check("on peut corriger un test qui a des fausses notes", canCorrect(rolled), true);
check("cocher une cartouche retire une fausse note", correctByCartridge(rolled).score.notes, 1);
check("et compte pour une correction", correctByCartridge(rolled).corrected, 1);

// « Il peut retirer une fausse note en endommageant un trait. »
const dented = correctByTrait(rolled, "A");
check("entamer un trait retire une fausse note", dented.score.notes, 1);
check("le trait entamé n'est plus utilisable", states(dented), ["A:dented", "B:usable"]);
check("un trait entamé ne donne plus de dé", poolOf(dented).formula, "3d6");

// « Un trait endommagé ne peut plus servir à ajouter des dés à un test ni à
// corriger une fausse note. »
check("un trait entamé ne corrige plus rien", correctByTrait(dented, "A"), dented);
check("un trait inconnu ne corrige rien", correctByTrait(rolled, "Z"), rolled);

// Deux corrections, et plus une de plus.
const twice = correctByCartridge(correctByCartridge(rolled));
check("deux corrections épuisent les fausses notes", twice.score.notes, 0);
check("et le droit de corriger", canCorrect(twice), false);
check("une troisième correction ne fait rien", correctByCartridge(twice), twice);

// Le plafond mord avant les fausses notes : trois notes, deux corrections.
const threeNotes = applyDice(opened(), [1, 1, 1, 4]);
const corrected = correctByCartridge(correctByCartridge(threeNotes));
check("il reste une fausse note pour Big Shot", corrected.score.notes, 1);
check("mais plus de correction", canCorrect(corrected), false);
check("le troisième trait ne s'entame pas", correctByTrait(corrected, "B"), corrected);

// ==========================================================================
// LES TRAITS DU MONO D'ABORD
// ==========================================================================

// « Ces traits sont endommagés, et même sévèrement endommagés, avant tout autre
// trait » : le vaisseau encaisse avant son pilote, correction comme pari.
const withMono = applyDice(
  opened([trait("A"), trait("M", "mono"), trait("B")]),
  [1, 1, 4, 4, 4]
);

check("le MONO passe en tête de carte", keys(cardTraits(withMono)), ["M", "A", "B"]);
check(
  "les traits du chasseur sont barrés tant qu'il reste du MONO",
  cardTraits(withMono).map((t) => t.blocked),
  [false, true, true]
);
check("et ne s'entament pas", correctByTrait(withMono, "A"), withMono);
check("ni ne se misent", keys(stakeableTraits(withMono)), ["M"]);

// Une fois le MONO dépensé, le chasseur se rouvre.
const monoSpent = correctByTrait(withMono, "M");
check("le MONO dépensé rouvre le chasseur", keys(stakeableTraits(monoSpent)), ["A", "B"]);
check(
  "plus rien n'est barré",
  cardTraits(monoSpent).filter((t) => t.blocked).length,
  0
);

// Marchandises dangereuses : après les deux corrections ordinaires, seul un
// trait de MONO ouvre la troisième.
const dangerous = {
  ...applyDice(opened([trait("A"), trait("M", "mono")]), [1, 1, 1, 4]),
  grooveRules: { dangerousGoods: true },
};
const dangerousTwice = correctByCartridge(correctByCartridge(dangerous));
check("la troisième correction refuse le chasseur", correctByTrait(dangerousTwice, "A"), dangerousTwice);
const dangerousThird = correctByTrait(dangerousTwice, "M");
check("un MONO donne la troisième correction", dangerousThird.corrected, 3);
check("et retire la dernière fausse note", dangerousThird.score.notes, 0);

// Plus c'est petit : les deux dégâts sont atomiques et la priorité du MONO est
// relue entre les deux choix.
const smaller = {
  ...applyDice(opened([trait("M", "mono"), trait("A")]), [1, 4, 4, 4]),
  grooveRules: { smallerBites: true },
};
check("le double dégât refuse un seul trait", correctByTrait(smaller, "M"), smaller);
check("le chasseur reste barré au premier choix", correctByTrait(smaller, "A", "M"), smaller);
check(
  "le dernier MONO puis le chasseur tombent ensemble",
  states(correctByTrait(smaller, "M", "A")),
  ["M:dented", "A:dented"]
);

// ==========================================================================
// QUITTE OU DOUBLE
// ==========================================================================

// « Il ignore alors complètement le premier jet et relance son groupement en y
// ajoutant un dé. » Le trait mis en jeu n'est pas encore brisé : il donne
// toujours le sien.
check("la relance ajoute un dé au groupement", rerollPool(rolled).formula, "5d6");
check("tous les traits sont misables", keys(stakeableTraits(rolled)), ["A", "B"]);

// « Relance son groupement » : les dés comptés à la main en font partie, donc
// ils repartent avec, et le dé du pari s'ajoute par-dessus.
check(
  "la relance garde les dés ajoutés à la main",
  rerollPool({ ...rolled, bonusDice: 2 }).formula,
  "7d6"
);
// Après le pari : le trait A est brisé, donc il retire son dé, mais les deux
// dés comptés à la main et celui de la relance restent.
const stakedWithBonus = resolveReroll(
  { ...rolled, bonusDice: 2 },
  "A",
  [1, 1, 1, 1, 1, 1, 1]
);
check("les dés ajoutés survivent au pari", stakedWithBonus.bonusDice, 2);
check("et le groupement les compte encore", poolOf(stakedWithBonus).formula, "6d6");

// « S'il ne fait pas les deux cartons […] il doit rayer d'une croix le trait mis
// en jeu afin de signaler des dommages sévères. »
const lost = resolveReroll(rolled, "A", [2, 2, 3, 3, 4]);
check("le second résultat remplace le premier", lost.score.total, 14);
check("un seul carton, donc le trait est brisé", states(lost), ["A:broken", "B:usable"]);
check("le test est marqué relancé", lost.rerolled, true);

// « Le trait ne peut être ni utilisé ni récupéré avant la fin de la session. »
check("un trait brisé ne donne plus de dé", keys(usableTraits(lost)), ["B"]);
check("ni ne se remise", keys(stakeableTraits(lost)), ["B"]);
check("ni ne corrige", correctByTrait(lost, "A").traits[0].state, "broken");

// C'est ce qui borne le pari : le dé gagné par la relance est repris par le
// trait perdu, donc le groupement ne s'emballe jamais.
check("le groupement ne monte pas", poolOf(lost).formula, "4d6");
check("la relance suivante non plus", rerollPool(lost).formula, "4d6");

// Les deux cartons - seuil atteint *et* deux 6 - sauvent le trait.
const won = resolveReroll(rolled, "A", [6, 6, 5, 3, 2]);
check("les deux cartons", won.score.cartons, 2);
check("le trait misé est sauf", states(won), ["A:usable", "B:usable"]);

// « Les deux cartons » veut dire les deux : deux 6 sans le seuil n'en font
// qu'un, et le trait tombe quand même. Il faut un seuil durci pour l'éprouver -
// au mouvement 2, deux 6 dépassent forcément 10.
const hard = applyDice(
  { ...opened(), mouvement: { ...TROIS_DEUX_UN, difficulty: 14, modifier: 4 } },
  [4, 4, 4, 4]
);
const halfWon = resolveReroll(hard, "A", [6, 6, 1]);
check("deux 6 sous le seuil ne font qu'un carton", halfWon.score.cartons, 1);
check("le trait tombe quand même", halfWon.traits[0].state, "broken");

// Et le seuil seul, sans les deux 6, ne sauve pas davantage.
const thresholdOnly = resolveReroll(rolled, "A", [6, 3, 3, 2, 2]);
check("le seuil seul ne fait qu'un carton", thresholdOnly.score.cartons, 1);
check("le trait tombe aussi", thresholdOnly.traits[0].state, "broken");

// « Les corrections repartent à zéro » : le nouveau jet est un nouveau test.
const afterCorrection = resolveReroll(twice, "A", [2, 2, 2, 2, 1]);
check("la relance rouvre les corrections", afterCorrection.corrected, 0);
check("et on peut corriger à nouveau", canCorrect(afterCorrection), true);

// Mais ce qui a été payé reste payé : le trait entamé pour corriger l'est
// toujours, et ne revient pas dans le groupement.
const afterTraitCorrection = resolveReroll(dented, "B", [2, 2, 2, 2]);
check("le trait entamé le reste", afterTraitCorrection.traits[0].state, "dented");
check("le groupement part des traits utilisables", rerollPool(dented).formula, "4d6");

// Rejouable tant qu'il reste un trait à miser, et pas au-delà.
const bothLost = resolveReroll(lost, "B", [2, 2, 2, 2]);
check("les deux traits y passent", states(bothLost), ["A:broken", "B:broken"]);
check("plus rien à miser", keys(stakeableTraits(bothLost)), []);
// Le mouvement, plus le dé de la relance en cours : les deux traits sont
// partis, mais le jet qui a produit ce score était bien une relance.
check("le groupement retombe au mouvement", poolOf(bothLost).formula, "3d6");

// Un trait qu'on ne peut pas miser ne casse rien.
check("miser un trait inconnu ne fait rien", resolveReroll(rolled, "Z", [1, 1, 1, 1, 1]), rolled);
check("miser un trait brisé ne fait rien", resolveReroll(lost, "A", [1, 1, 1, 1]), lost);

// ==========================================================================
// SOLDER
// ==========================================================================

check("un test soldé ne porte plus de jetons", settle(rolled).score, {
  total: 10,
  cartons: 0,
  notes: 0,
});
check("il est marqué soldé", settle(rolled).settled, true);
check("et ne se corrige plus", canCorrect(settle(rolled)), false);
check("ni ne se relance", keys(stakeableTraits(settle(rolled))), []);

// ==========================================================================

if (failures > 0) {
  console.log(`\n${failures} test(s) en échec`);
  process.exit(1);
}
console.log("\ntout passe");
