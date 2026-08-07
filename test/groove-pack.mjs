import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";
import { transformGrooveEntry } from "../build/groove-pack.mjs";

const source = path.resolve("src/packs/grooves");
const files = (await fs.readdir(source)).filter((file) => file.endsWith(".json"));
const documents = await Promise.all(
  files.map(async (file) => JSON.parse(await fs.readFile(path.join(source, file), "utf8")))
);
const grooves = documents.filter((document) => document.type === "groove");
const folders = documents.filter((document) => document._key.startsWith("!folders!"));

assert.equal(grooves.length, 33, "le catalogue contient 33 grooves");
assert.equal(folders.length, 2, "le catalogue contient les dossiers chasseurs et primes");
assert.equal(grooves.filter((item) => item.system.audience === "chasseur").length, 11);
assert.equal(grooves.filter((item) => item.system.audience === "prime").length, 22);
assert.equal(grooves.filter((item) => item.system.substitution?.from).length, 5);
assert.equal(grooves.filter((item) => item.system.activations?.length).length, 14);
assert.equal(grooves.filter((item) => item.system.reminders?.length).length, 11);
assert.equal(grooves.filter((item) => item.system.activations?.length && item.system.reminders?.length).length, 1);

for (const item of grooves) {
  assert.equal(item.type, "groove");
  assert.equal(item._key, `!items!${item._id}`);
  assert.ok(item.name);
  assert.ok(item.system.description);
  assert.ok(Array.isArray(item.system.activations));
  assert.ok(Array.isArray(item.system.reminders));
  assert.equal("payments" in item.system, false);
  assert.equal("rules" in item.system, false);
  assert.equal("modulations" in item.system, false);
}

const bespoke = new Set([
  "grooveHunter09",
  "groovePrime015",
  "groovePrime018",
  "groovePrime022",
]);
const allAccountedFor = grooves.every((item) =>
  item.system.activations.length > 0 ||
  item.system.reminders.length > 0 ||
  Boolean(item.system.substitution?.from) ||
  bespoke.has(item._id)
);
assert.equal(allAccountedFor, true, "chaque groove est joué, substitue ou rappelle explicitement");

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "cowboy-grooves-"));
const translations = JSON.parse(
  await fs.readFile(path.resolve("src/translations/packs/grooves.en.json"), "utf8")
);

async function compileAndReload(language) {
  const database = path.join(temporary, `grooves-${language}`);
  const extracted = path.join(temporary, `extracted-${language}`);
  await compilePack(source, database, {
    transformEntry: (document) => transformGrooveEntry(document, language, translations),
  });
  await extractPack(database, extracted);
  const reloadedFiles = (await fs.readdir(extracted)).filter((file) => file.endsWith(".json"));
  return Promise.all(
    reloadedFiles.map(async (file) => JSON.parse(await fs.readFile(path.join(extracted, file), "utf8")))
  );
}

try {
  const french = await compileAndReload("fr");
  const english = await compileAndReload("en");
  const frenchGrooves = french.filter((document) => document.type === "groove");
  const englishGrooves = english.filter((document) => document.type === "groove");

  assert.equal(frenchGrooves.length, 33, "la base française restitue les 33 grooves");
  assert.equal(englishGrooves.length, 33, "la base anglaise restitue les 33 grooves");
  assert.equal(french.filter((document) => document._key.startsWith("!folders!")).length, 2);
  assert.equal(english.filter((document) => document._key.startsWith("!folders!")).length, 2);
  assert.equal(frenchGrooves.filter((item) => item.folder === "grooveHunters001").length, 11);
  assert.equal(frenchGrooves.filter((item) => item.folder === "grooveBounties01").length, 22);
  assert.equal(englishGrooves.filter((item) => item.folder === "grooveHunters001").length, 11);
  assert.equal(englishGrooves.filter((item) => item.folder === "grooveBounties01").length, 22);
  assert.equal(englishGrooves.find((item) => item._id === "grooveHunter05")?.name, "Lone Wolf");
  assert.match(
    englishGrooves.find((item) => item._id === "groovePrime002")?.system.description ?? "",
    /^Handled by the system\./
  );
  assert.deepEqual(
    englishGrooves.map((item) => item._id).sort(),
    frenchGrooves.map((item) => item._id).sort(),
    "les deux langues gardent exactement le même catalogue mécanique"
  );
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

console.log("✓ packs grooves FR/EN : 33 entrées, deux dossiers, deux bases LevelDB relues");
