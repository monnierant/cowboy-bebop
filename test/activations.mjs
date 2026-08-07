import assert from "node:assert/strict";
import {
  activationErrors,
  activationScopes,
  activeEffects,
  applyAdvantageEffects,
  applyResultEffects,
  canonicalEffects,
  conditionKinds,
  conditionsMatch,
  isForbidden,
  normalizeActivation,
  permitsDentedTraits,
  prohibitions,
  resultTransformations,
  survives,
} from "./.out/rolls/activationTerms.js";
import {
  applyDice,
  openTest,
  rerollRemovedDie,
  rewriteDie,
} from "./.out/rolls/testState.js";

const context = { advantage: -1, category: "rock", genre: "jazz" };
const activation = normalizeActivation({
  conditions: [{ kind: "underDisadvantage" }],
  paymentOptions: [[{ resource: "rythme", amount: 1 }, { resource: "cartridge", amount: 1 }]],
  effects: [{ kind: "dentedTraitsOnDisadvantage" }, { kind: "disadvantageDoubleCarton", amount: 99 }],
});
assert.deepEqual(activation.paymentOptions[0], [
  { resource: "rythme", amount: 1 },
  { resource: "cartridge", amount: 1 },
]);
assert.deepEqual(activation.effects, [
  { kind: "dentedTraitsOnDisadvantage" },
  { kind: "disadvantageDoubleCarton" },
]);
assert.equal(permitsDentedTraits(-1, activeEffects([activation], context)), true);

const identity = normalizeActivation({ effects: [{ kind: "forbid", target: "disadvantage" }] });
assert.equal(applyAdvantageEffects(-1, identity.effects), 0);
assert.equal(isForbidden(identity.effects, "disadvantage"), true);
assert.deepEqual(activationErrors({ effects: [{ kind: "magic" }] }), ["effects"]);
assert.deepEqual(
  activationErrors({ effects: [{ kind: "dice", amount: 1 }], paymentOptions: [[{ resource: "gloire", amount: 1 }]] }),
  ["paymentOptions"]
);
assert.deepEqual(
  activationErrors({ effects: [{ kind: "dentedTraitsOnDisadvantage", amount: 1 }] }),
  ["effects"]
);

const result = applyResultEffects(
  [3, 3, 5],
  { total: 11, cartons: 0, notes: 0 },
  -1,
  [
    { kind: "minimumNotes", amount: 2 },
    { kind: "notesPerMissingCarton", amount: 2 },
    { kind: "disadvantageDoubleCarton" },
  ]
);
assert.deepEqual(result, { total: 11, cartons: 1, notes: 2 });
assert.deepEqual(canonicalEffects([
  { kind: "minimumNotes", amount: 2 },
  { kind: "dice", amount: 1 },
  { kind: "forbid", target: "damageRemoval" },
]), [
  { kind: "forbid", target: "damageRemoval" },
  { kind: "dice", amount: 1 },
  { kind: "minimumNotes", amount: 2 },
]);
// ========================================
// Les vocabulaires sont fermés
// ========================================

assert.deepEqual(activationScopes, ["test", "mouvement", "session"]);
assert.deepEqual(conditionKinds, ["underDisadvantage", "sessionGenre", "offSessionGenre"]);
assert.deepEqual(prohibitions, ["disadvantage", "damageRemoval", "cartonAgainstDifficulty"]);
assert.deepEqual(resultTransformations, ["rerollPool", "rerollRemovedDie", "rewriteDie"]);

// ========================================
// Quels tests une activation vise
// ========================================
//
// Une condition ne nomme jamais un genre : elle le compare à celui de la
// session (ADR 0013). Un filtre par genre en dur deviendrait faux à la session
// suivante.

const on = (kinds, category, genre) =>
  conditionsMatch(kinds.map((kind) => ({ kind })), { advantage: 0, category, genre });

assert.equal(on([], "rock", "jazz"), true);
// Contrôle à distance vise l'approche du genre de session.
assert.equal(on(["sessionGenre"], "jazz", "jazz"), true);
assert.equal(on(["sessionGenre"], "rock", "jazz"), false);
// Raid spécial vise tout sauf le genre.
assert.equal(on(["offSessionGenre"], "rock", "jazz"), true);
assert.equal(on(["offSessionGenre"], "jazz", "jazz"), false);
// Toutes conjointes : une alternative s'écrit comme une autre activation.
assert.equal(
  conditionsMatch([{ kind: "underDisadvantage" }, { kind: "sessionGenre" }], {
    advantage: 0, category: "jazz", genre: "jazz",
  }),
  false
);

// Maître-artificier pose deux activations d'un coup, une par condition.
const artificier = [
  normalizeActivation({
    conditions: [{ kind: "sessionGenre" }], effects: [{ kind: "dice", amount: -1 }],
  }),
  normalizeActivation({
    conditions: [{ kind: "offSessionGenre" }], effects: [{ kind: "notes", amount: 2 }],
  }),
];
assert.deepEqual(activeEffects(artificier, { advantage: 0, category: "jazz", genre: "jazz" }), [
  { kind: "dice", amount: -1 },
]);
assert.deepEqual(activeEffects(artificier, { advantage: 0, category: "rock", genre: "jazz" }), [
  { kind: "notes", amount: 2 },
]);

// ========================================
// Ce qui éteint une activation en cours
// ========================================

const scoped = (scope, untilSecret = false) => ({
  conditions: [], paymentOptions: [], effects: [{ kind: "dice", amount: 1 }],
  scope, ...(untilSecret ? { untilSecret: true } : {}),
});

// Une activation instantanée ne court pas : rien ne lui survit.
assert.equal(survives({ conditions: [], paymentOptions: [], effects: [] }, "test"), false);
assert.equal(survives(scoped("test"), "test"), false);
assert.equal(survives(scoped("mouvement"), "test"), true);
// Dans les deux sens : revenir en arrière n'est pas rejouer le même mouvement.
assert.equal(survives(scoped("mouvement"), "mouvement"), false);
assert.equal(survives(scoped("session"), "mouvement"), true);
assert.equal(survives(scoped("session"), "session"), false);
// Le secret est une seconde horloge, indépendante de la portée.
assert.equal(survives(scoped("session"), "secret"), true);
assert.equal(survives(scoped("session", true), "secret"), false);
// Regarde dans l'abîme s'éteint au premier des deux.
assert.deepEqual(
  [survives(scoped("mouvement", true), "mouvement"), survives(scoped("mouvement", true), "secret")],
  [false, false]
);
// Les deux drapeaux ne veulent rien dire sans portée, et sont refusés seuls.
assert.deepEqual(activationErrors({ effects: [], untilSecret: true }), ["scope"]);

const fresh = openTest({
  actorId: "spike", genre: "jazz", category: "rock", mouvementIndex: 0,
  mouvement: { name: "OK", difficulty: 5, dices: 1, notes: 1, modifier: 0 },
  advantage: 0, traits: [],
});
const rolled = applyDice(fresh, [2, 3]);
const rewritten = rewriteDie(rolled, 0, 6, "Hors des sentiers battus");
const rerolled = rerollRemovedDie(rewritten, 4, "Maître de la bidouille");
assert.deepEqual(rerolled.history.map((step) => step.kind), ["roll", "rewrite", "rerollRemovedDie"]);
assert.deepEqual(rerolled.history[0].dice, [2, 3]);
assert.deepEqual(rerolled.history[1].dice, [6, 3]);

console.log("\nactivations: tout passe");
