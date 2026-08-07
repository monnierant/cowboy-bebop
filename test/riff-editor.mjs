// Le gabarit de l'éditeur de riffs, compilé hors de Foundry.
//
// C'est la pièce la plus dense du système : trois mouvements, deux familles, une
// ligne par riff ouvert et un formulaire d'activation par ligne. Elle ne
// s'affiche que sur une fiche de prime ou de type de session, donc une balise
// mal fermée ou un partial mal nommé ne se verrait qu'en pleine préparation de
// partie.
//
// Depuis l'ADR 0012, le formulaire est celui d'un groove : ce fichier tient donc
// surtout ce qui lui est propre — le mode `single`, la cible qui porte son
// mouvement, et la correction, qui n'est pas une Activation.
//
// Les données sont écrites à la main plutôt que produites par `riffs.ts` : ce
// module lit `system.json` et `game`, que node n'a pas. Ce qu'on tient ici est
// donc le gabarit, pas le producteur - lequel est tenu par `test/riffs.mjs`.

import fs from "node:fs";
import Handlebars from "handlebars";

Handlebars.registerHelper("localize", (key) => key);

const read = (name) =>
  fs.readFileSync(
    new URL(`../src/templates/partials/${name}`, import.meta.url),
    "utf8"
  );

for (const name of ["activation-editor.hbs", "correction-terms.hbs"]) {
  Handlebars.registerPartial(
    `systems/cowboy-bebop/templates/partials/${name}`,
    read(name)
  );
}

const template = Handlebars.compile(read("riff-editor.hbs"));

const target = (kind, key) =>
  JSON.stringify(kind === "riff" ? { kind, id: key, mouvement: 0 } : { kind, index: key, mouvement: 0 });

/** Un paiement tel qu'`activationRow` le construit : son menu déjà résolu. */
const payment = (resource, amount, index = 0) => ({
  resource,
  amount,
  index,
  options: [
    { value: "cartridge", label: "cartouche", selected: resource === "cartridge" },
    { value: "rythme", label: "rythme", selected: resource === "rythme" },
    { value: "stakeTrait", label: "trait misé", selected: resource === "stakeTrait" },
  ],
});

const effect = (kind, amount, index = 0) => ({
  kind,
  amount,
  index,
  quantified: true,
  kinds: [
    { value: "dice", label: "dés", selected: kind === "dice" },
    { value: "advantage", label: "avantage", selected: kind === "advantage" },
  ],
});

/**
 * Une activation de riff : seule, sans horloge, avec sa cible.
 *
 * `scopes` absent est ce qui dit « instantanée » : un riff n'a pas d'horloge, le
 * livre ne lui en donne jamais.
 */
const activation = (serialized, options, effects, flags = {}) => [
  {
    target: serialized,
    single: true,
    invalid: false,
    conditions: [
      { value: "underDisadvantage", label: "sous désavantage", checked: false },
    ],
    conditioned: false,
    paymentOptions: options.map((payments, index) => ({
      index,
      separated: index > 0,
      payments,
    })),
    effects,
    json: "{}",
    ...flags,
  },
];

const html = template({
  riffEditor: [
    {
      mouvement: 0,
      name: "OK",
      current: true,
      correction: {
        mouvement: 0,
        payments: [
          { ...payment("cartridge", 1, 0), counter: true },
          { ...payment("rythme", 1, 1), counter: true },
        ],
      },
      families: [
        {
          audience: "hunter",
          title: "Chasseurs",
          icon: "fa-guitar",
          mouvement: 0,
          open: [
            {
              id: "involve",
              name: "S'impliquer",
              description: "Cochez une cartouche…",
              selected: true,
              mouvement: 0,
              activations: activation(
                target("riff", "involve"),
                [[payment("cartridge", 1)]],
                [effect("dice", 2)],
                { resettable: true }
              ),
            },
            {
              id: "doubleOrNothing",
              name: "Quitte ou double",
              description: "Relancez…",
              selected: true,
              mouvement: 0,
              activations: activation(
                target("riff", "doubleOrNothing"),
                [[payment("stakeTrait", 1)]],
                [],
                { bespoke: true, resettable: true }
              ),
            },
            {
              id: "assist",
              name: "Assister",
              description: "Conférez l'avantage…",
              selected: true,
              mouvement: 0,
              activations: activation(
                target("riff", "assist"),
                [[payment("rythme", 1)]],
                [effect("advantage", 1)],
                { owed: true, resettable: true }
              ),
            },
          ],
          closed: [
            {
              id: "force",
              name: "Forcer",
              description: "Deux fausses notes…",
              selected: false,
              mouvement: 0,
            },
          ],
          custom: [
            {
              name: "Duo de saxo",
              description: "Les deux chasseurs se répondent…",
              audience: "hunter",
              index: 0,
              mouvement: 0,
              activations: activation(
                target("custom", 0),
                [[payment("rythme", 1)]],
                [effect("dice", 2)]
              ),
            },
          ],
        },
      ],
    },
  ],
});

let failures = 0;
const check = (label, condition) => {
  if (condition) {
    console.log(`ok   ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL ${label}`);
  }
};

// Chaque ligne de riff, isolée : les fenêtres de caractères se périment dès
// qu'on ajoute une rangée au formulaire, et une assertion qui déborde sur le
// riff suivant passerait pour de mauvaises raisons.
const rowOf = (id) =>
  html
    .split('<div class="cowboy-riff-row')
    .find((block) => block.includes(`data-riff="${id}"`)) ?? "";

// Un riff ouvert tient sur une ligne, avec son activation.
check(
  "un riff ouvert porte sa case cochée",
  /class="cowboy-riff-toggle"[^>]*data-riff="involve"[^>]*checked/.test(html)
);
check(
  "et son formulaire sur la même ligne",
  rowOf("involve").includes("cowboy-activation-payment-resource")
);
check(
  "le menu du paiement montre la ressource choisie",
  /cowboy-activation-payment-resource[\s\S]*?value="cartridge" selected/.test(html)
);
check("un effet est éditable", /class="cowboy-activation-effect-kind"/.test(html));

// La cible porte son mouvement : c'est elle que le câblage renvoie telle quelle,
// et sans elle une retouche s'écrirait sur le mauvais mouvement.
check(
  "la cible porte son mouvement",
  html.includes("&quot;id&quot;:&quot;involve&quot;,&quot;mouvement&quot;:0")
);
check(
  "un riff libre est adressé par son rang",
  html.includes("&quot;kind&quot;:&quot;custom&quot;,&quot;index&quot;:0")
);

// Une activation seule n'a ni titre, ni bouton d'ajout, ni bouton de retrait :
// un riff en porte exactement une, celle qui dit ce qu'il coûte et ce qu'il fait.
check("aucune activation ne s'ajoute à un riff", !html.includes("cowboy-activation-add"));
check("ni ne se retire", !html.includes("cowboy-activation-remove"));
check("et aucune n'est titrée", !html.includes("cowboy-activation-title"));

// Un riff n'a pas d'horloge : le livre ne lui en donne jamais.
check("un riff n'offre pas de durée", !html.includes("cowboy-activation-scope"));

// Un riff câblé n'offre pas de menu d'effets : il offre un cadenas.
const bespokeRow = rowOf("doubleOrNothing");
check(
  "un riff câblé n'offre aucun effet",
  bespokeRow.includes("fa-lock") && !bespokeRow.includes("cowboy-activation-effect-kind")
);

// Un riff dû par quelqu'un d'autre le dit, et le dit sur sa propre ligne.
check("un riff dû porte sa marque", rowOf("assist").includes("fa-hand-holding-heart"));
check("et pas les autres", !rowOf("involve").includes("fa-hand-holding-heart"));

// Un riff du livre sait rendre son prix du livre ; un riff libre n'en a pas.
check("un riff du livre se remet à zéro", html.includes("cowboy-activation-reset"));
const customRow = /class="cowboy-riff-row is-custom"[\s\S]*$/.exec(html)?.[0] ?? "";
check(
  "un riff libre n'a rien à rendre",
  !customRow.includes("cowboy-activation-reset")
);

// Les riffs fermés sont ramassés sur une rangée, sans réglages.
const closed = /class="cowboy-riff-closed"[\s\S]*?<\/div>/.exec(html)?.[0] ?? "";
check("un riff fermé est dans la rangée", closed.includes('data-riff="force"'));
check(
  "et n'y porte aucun réglage",
  !closed.includes("cowboy-activation-payment-resource")
);

// La correction a sa ligne, et n'est pas une Activation : un prix, rien d'autre.
const rule = /class="cowboy-riff-row is-rule"[\s\S]*?<\/div>/.exec(html)?.[0] ?? "";
check(
  "la correction offre ses deux paiements",
  (rule.match(/cowboy-correction-payment-resource/g) ?? []).length === 2
);
check("et aucun effet", !rule.includes("cowboy-activation-effect-kind"));
check("ni condition", !rule.includes("cowboy-activation-condition"));
check("elle se remet au prix du livre", rule.includes("cowboy-correction-reset"));

// Un riff libre : son nom s'écrit dans la ligne, son rappel dessous.
check(
  "un riff libre porte son nom éditable",
  /class="cowboy-riff-custom-name"[^>]*value="Duo de saxo"/.test(html)
);
check(
  "et son rappel sur une seule ligne",
  /class="cowboy-riff-custom-description" rows="1"/.test(html)
);

// Les libellés en toutes lettres ont laissé la place à des icônes.
check("le coût est une icône", html.includes("fa-coins"));
check("les effets aussi", html.includes("fa-wave-square"));

console.log(failures === 0 ? "\ntout passe" : `\n${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
