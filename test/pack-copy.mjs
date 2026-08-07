import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { replacePackDirectory } from "../build/copy-pack.mjs";

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "cowboy-pack-copy-"));
const source = path.join(temporary, "compiled");
const destination = path.join(temporary, "installed");

try {
  await fs.mkdir(source);
  await fs.mkdir(destination);
  await fs.writeFile(path.join(source, "000005.ldb"), "current generation");
  await fs.writeFile(path.join(source, "CURRENT"), "MANIFEST-000002");
  await fs.writeFile(path.join(destination, "000003.ldb"), "stale generation");
  await fs.writeFile(path.join(destination, "CURRENT"), "MANIFEST-000001");

  await replacePackDirectory(source, destination);

  assert.deepEqual((await fs.readdir(destination)).sort(), ["000005.ldb", "CURRENT"]);
  assert.equal(await fs.readFile(path.join(destination, "000005.ldb"), "utf8"), "current generation");
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

console.log("✓ déploiement des packs : aucune génération LevelDB obsolète ne survit");
