import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";
import { transformSessionEntry } from "../build/session-pack.mjs";

const source = path.resolve("src/packs/types-de-session");
const files = (await fs.readdir(source)).filter((file) => file.endsWith(".json"));
const documents = await Promise.all(
  files.map(async (file) => JSON.parse(await fs.readFile(path.join(source, file), "utf8")))
);
const sessionTypes = documents.filter((document) => document.type === "sessionType");
const folders = documents.filter((document) => document._key.startsWith("!folders!"));

assert.equal(sessionTypes.length, 4, "le catalogue contient les quatre types de session");
assert.equal(folders.length, 2, "le catalogue contient les dossiers standard et spéciaux");
for (const item of sessionTypes) {
  assert.equal(item._key, `!items!${item._id}`);
  assert.equal(item.system.riffs.length, 3, `${item.name} décrit les trois mouvements`);
}

const translations = JSON.parse(
  await fs.readFile(path.resolve("src/translations/packs/types-de-session.en.json"), "utf8")
);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "cowboy-sessions-"));

async function compileAndReload(language) {
  const database = path.join(temporary, `sessions-${language}`);
  const extracted = path.join(temporary, `extracted-${language}`);
  await compilePack(source, database, {
    transformEntry: (document) => transformSessionEntry(document, language, translations),
  });
  await extractPack(database, extracted);
  const extractedFiles = (await fs.readdir(extracted)).filter((file) => file.endsWith(".json"));
  return Promise.all(
    extractedFiles.map(async (file) =>
      JSON.parse(await fs.readFile(path.join(extracted, file), "utf8"))
    )
  );
}

try {
  const french = await compileAndReload("fr");
  const english = await compileAndReload("en");
  const frenchItems = french.filter((document) => document.type === "sessionType");
  const englishItems = english.filter((document) => document.type === "sessionType");
  const frenchFolders = french.filter((document) => document._key.startsWith("!folders!"));
  const englishFolders = english.filter((document) => document._key.startsWith("!folders!"));

  assert.equal(frenchItems.length, 4);
  assert.equal(englishItems.length, 4);
  assert.equal(frenchFolders.length, 2);
  assert.equal(englishFolders.length, 2);
  assert.equal(frenchItems.filter((item) => item.folder === "sessionStandard1").length, 2);
  assert.equal(frenchItems.filter((item) => item.folder === "sessionSpecial01").length, 2);
  assert.equal(englishItems.filter((item) => item.folder === "sessionStandard1").length, 2);
  assert.equal(englishItems.filter((item) => item.folder === "sessionSpecial01").length, 2);
  assert.equal(
    englishItems.find((item) => item._id === "sessionClassiq01")?.name,
    "Classic Session"
  );
  assert.equal(
    englishFolders.find((folder) => folder._id === "sessionSpecial01")?.name,
    "Special Sessions"
  );

  for (const frenchItem of frenchItems) {
    const englishItem = englishItems.find((item) => item._id === frenchItem._id);
    assert.ok(englishItem, `${frenchItem.name} existe dans les deux langues`);
    assert.deepEqual(
      englishItem.system.riffs,
      frenchItem.system.riffs,
      `${frenchItem.name} garde exactement les mêmes riffs et coûts`
    );
  }
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

console.log("✓ packs sessions FR/EN : 4 entrées, deux dossiers, deux bases LevelDB relues");
