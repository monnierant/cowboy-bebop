import assert from "node:assert/strict";
import {
  bigshotPaymentOptions,
  correctionLimit,
  grooveScore,
  hunterPaymentOptions,
  scoringDice,
} from "./.out/rolls/bespokeGrooves.js";

const pay = (resource, amount = 1) => ({ resource, amount });

assert.deepEqual(
  hunterPaymentOptions([[pay("rythme", 2)]], "spike", { vengeanceHunterId: "spike" }),
  [[pay("cartridge", 2)], [pay("cartridge"), pay("rythme")], [pay("rythme", 2)]]
);
assert.deepEqual(
  hunterPaymentOptions([[pay("rythme")]], "spike", {
    vengeanceHunterId: "spike",
    shadowsHunterIds: ["spike"],
  }),
  [[pay("cartridge")], [pay("rythme"), pay("cartridge", 2)]]
);
assert.deepEqual(
  bigshotPaymentOptions([[pay("risque", 2)]], { shadowsAccepted: true }),
  [[pay("risque", 4)]]
);
assert.deepEqual(scoringDice([1, 1, 6], "rock", "rock", { orbitalSafe: true }), [6]);
assert.deepEqual(scoringDice([1, 6], "blues", "rock", { orbitalSafe: true }), [1, 6]);
assert.deepEqual(
  grooveScore([1, 6], { difficulty: 7, dices: 1, notes: 2 }, "rock", "rock", { orbitalSafe: true }),
  { total: 7, cartons: 1, notes: 2 }
);
assert.equal(correctionLimit({ dangerousGoods: true }), 3);
assert.equal(correctionLimit({}), 2);

// Un slot de Vengeance vide ne lie personne. Sans cette garde, la chaîne vide
// s'égalisait avec un acteur non résolu et ouvrait la fongibilité à tort.
assert.deepEqual(
  hunterPaymentOptions([[pay("rythme")]], "", { vengeanceHunterId: "" }),
  [[pay("rythme")]]
);
assert.deepEqual(
  hunterPaymentOptions([[pay("rythme")]], "", { shadowsHunterIds: [""] }),
  [[pay("rythme")]]
);

console.log("✓ exceptions de grooves : paiements, otages et plafond de correction");
