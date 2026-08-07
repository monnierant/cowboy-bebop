// Ce que le vocabulaire des grooves promet, vérifié sans Foundry.
//
// Un groove est écrit dans un éditeur, comme un riff : ce qui arrive ici est du
// texte quelconque venu d'un document, et la moitié de ce fichier tient la
// normalisation. L'autre moitié tient la seule règle propre au groove qui ait
// une conséquence à la table — quelles approches une substitution ouvre.
//
// Tout ce qui touche aux Activations vit dans `activations.mjs` : un groove ne
// porte plus que trois choses, et deux d'entre elles sont tenues ailleurs.
//
// Voir l'ADR 0010 pour ce qu'un groove est, et l'ADR 0013 pour la frontière
// entre ses Activations, sa Substitution et ses Rappels.

import {
  grooveAudiences,
  normalizeGroove,
  normalizeSubstitution,
  openedApproaches,
  readAudience,
  reminderAudiences,
} from "./.out/rolls/grooveTerms.js";

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
// Les vocabulaires sont fermés
// ========================================

check("deux publics", grooveAudiences, ["chasseur", "prime"]);
check("deux publics de rappel", reminderAudiences, ["bigshot", "table"]);

check("un public illisible vaut chasseur", readAudience("bigshot"), "chasseur");
check("prime se lit", readAudience("prime"), "prime");

// ========================================
// La substitution, telle qu'on l'accepte
// ========================================

check(
  "Loup solitaire se lit tel quel",
  normalizeSubstitution({ from: "rock", to: ["blues", "jazz"] }),
  { from: "rock", to: ["blues", "jazz"] }
);
check(
  "une source vide vaut aucune substitution",
  normalizeSubstitution({ from: "", to: ["blues"] }),
  undefined
);
check(
  "des cibles vides aussi",
  normalizeSubstitution({ from: "rock", to: [] }),
  undefined
);
check(
  "prêter une approche à elle-même n'ouvre rien",
  normalizeSubstitution({ from: "rock", to: ["rock"] }),
  undefined
);
check(
  "et la cible en trop est jetée sans jeter le reste",
  normalizeSubstitution({ from: "rock", to: ["rock", "blues"] }),
  { from: "rock", to: ["blues"] }
);
check(
  "une cible répétée ne compte qu'une fois",
  normalizeSubstitution({ from: "rock", to: ["blues", "blues"] }),
  { from: "rock", to: ["blues"] }
);
check("rien du tout ne substitue rien", normalizeSubstitution(undefined), undefined);

// ========================================
// Ce qu'une substitution ouvre
// ========================================
//
// On lit dans le sens inverse de l'écriture : le groove dit « les traits de Rock
// servent aux tests de Blues », donc c'est un test de Blues qui ouvre Rock.

const loneWolf = { from: "rock", to: ["blues", "jazz"] };
const warMemory = { from: "blues", to: ["tango", "rock"] };

check("un test de Blues ouvre Rock", openedApproaches([loneWolf], "blues"), ["rock"]);
check("un test de Jazz aussi", openedApproaches([loneWolf], "jazz"), ["rock"]);
check("un test de Dance n'ouvre rien", openedApproaches([loneWolf], "dance"), []);
check("un test de Rock n'ouvre pas Rock", openedApproaches([loneWolf], "rock"), []);
check("sans groove, rien", openedApproaches([undefined], "blues"), []);

// Le seul moment où un test connaît deux substitutions : un Jam !.
check(
  "un groove prêté ouvre sa propre approche",
  openedApproaches([loneWolf, warMemory], "rock"),
  ["blues"]
);
check(
  "et les deux quand les deux visent le test",
  openedApproaches([loneWolf, { from: "dance", to: ["blues"] }], "blues"),
  ["rock", "dance"]
);
check(
  "deux grooves qui ouvrent la même approche ne l'ouvrent qu'une fois",
  openedApproaches([loneWolf, { from: "rock", to: ["blues"] }], "blues"),
  ["rock"]
);

// ========================================
// Le groove entier : trois choses, pas une de plus
// ========================================

const loneWolfGroove = normalizeGroove({
  audience: "chasseur",
  description: "Les traits de Rock pour Blues et Jazz.",
  substitution: { from: "rock", to: ["blues", "jazz"] },
  activations: [],
});
check("sa substitution est là", loneWolfGroove.substitution, {
  from: "rock",
  to: ["blues", "jazz"],
});
check("et il n'active rien", loneWolfGroove.activations, []);

// Un rappel sans texte n'est pas un rappel : c'est une ligne commencée, et elle
// s'afficherait comme un blanc au moment le plus utile.
check(
  "un rappel sans texte est jeté",
  normalizeGroove({ reminders: [{ audience: "table" }, { text: "Ouvrez un cadran." }] })
    .reminders.length,
  1
);
check(
  "un public de rappel illisible vaut Big Shot",
  normalizeGroove({ reminders: [{ text: "…", audience: "personne" }] }).reminders[0].audience,
  "bigshot"
);
check(
  "et « toute la table » se lit",
  normalizeGroove({ reminders: [{ text: "…", audience: "table" }] }).reminders[0].audience,
  "table"
);

// Un groove vide se lit : les trois champs sont là, et rien d'autre ne traîne.
check("un groove vide se lit", normalizeGroove(undefined), {
  audience: "chasseur",
  description: "",
  substitution: undefined,
  activations: [],
  reminders: [],
});

console.log(failures === 0 ? "\ntout passe" : `\n${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
