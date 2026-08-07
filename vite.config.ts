import * as fsPromises from "fs/promises";
import copy from "rollup-plugin-copy";
import scss from "rollup-plugin-scss";
import { defineConfig, Plugin } from "vite";
import path from "path";
import fs from "fs-extra";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import {
  GROOVE_PACK_LANGUAGES,
  GROOVE_SOURCE_PACK,
  transformGrooveEntry,
} from "./build/groove-pack.mjs";
import {
  SESSION_PACK_LANGUAGES,
  SESSION_SOURCE_PACK,
  transformSessionEntry,
} from "./build/session-pack.mjs";
import { replacePackDirectory } from "./build/copy-pack.mjs";

const moduleVersion = process.env.MODULE_VERSION;
const githubProject = process.env.GH_PROJECT;
const githubTag = process.env.GH_TAG;
const foundryPath = process.env.FOUNDRY_PATH;
const kindOfProject = process.env.KIND_OF_PROJECT || "system";

console.log(process.env.VSCODE_INJECTION);

const newLocal = "writeBundle";
export default defineConfig({
  base: "",
  build: {
    // sourcemap: true,
    assetsDir: "dist/assets/",
    rollupOptions: {
      input: "src/ts/module.ts",
      output: {
        assetFileNames: "assets/[name].[ext]",
        dir: "dist/scripts/",
        entryFileNames: "module.js",
        format: "es",
      },
      watch: {
        include: "src/**",
      },
    },
  },
  plugins: [
    copy({
      targets: [{ src: "src/*.json", dest: "dist" }],
    }),
    updateModuleManifestPlugin(kindOfProject),
    // scss({
    //   fileName: "style.css",
    //   sourceMap: true,
    //   watch: ["src/styles/*.scss"],
    // }),
    copy({
      targets: [
        { src: "src/languages", dest: "dist" },
        { src: "src/templates", dest: "dist" },
        // { src: "src/images", dest: "dist" },
      ],
      // hook: newLocal,
    }),
    compilePacksPlugin(kindOfProject),
    conditionalCopyPlugin(kindOfProject),
  ],
});

/**
 * Compiles the compendium sources into the LevelDB packs Foundry actually reads.
 *
 * The manifest is what says which packs exist - the same list Foundry loads - so
 * there is no second list here to keep in step with it. A pack declared as
 * `"path": "packs/session-types"` is built from `src/packs/session-types/` into
 * `dist/packs/session-types/`.
 *
 * One document per source file, in JSON or YAML. Each carries the `_key` the
 * CLI keys the database on: `"_key": "!items!<the same id as _id>"`. A file
 * without one is skipped silently by the CLI, which is why the count is logged.
 */
function compilePacksPlugin(kind: string = "module"): Plugin {
  return {
    name: "compile-packs",
    async writeBundle(): Promise<void> {
      const manifest = JSON.parse(
        await fsPromises.readFile(`src/${kind}.json`, "utf-8")
      ) as { packs?: { name: string; path: string }[] };

      const packs = manifest.packs ?? [];
      if (packs.length === 0) return;

      for (const pack of packs) {
        const grooveLanguage = GROOVE_PACK_LANGUAGES[pack.name];
        const sessionLanguage = SESSION_PACK_LANGUAGES[pack.name];
        const sourcePack = grooveLanguage
          ? GROOVE_SOURCE_PACK
          : sessionLanguage
            ? SESSION_SOURCE_PACK
            : pack.name;
        const src = path.resolve(__dirname, "src", "packs", sourcePack);
        const dest = path.resolve(__dirname, "dist", pack.path);

        if (!fs.existsSync(src)) {
          // A declared pack with no sources is a mistake worth naming: Foundry
          // would show an empty compendium and say nothing about why.
          console.warn(
            `Pack "${pack.name}" is declared in the manifest but ${path.relative(
              __dirname,
              src
            )} does not exist -> skipped.`
          );
          continue;
        }

        // Rebuilt from scratch each time. compilePack does delete keys that are
        // no longer in the sources, but a pack whose *name* changed would leave
        // its old database behind for Foundry to find.
        await fs.remove(dest);
        const translationFile = grooveLanguage === "en"
          ? "grooves.en.json"
          : sessionLanguage === "en"
            ? "types-de-session.en.json"
            : undefined;
        const translations = translationFile
          ? JSON.parse(
              await fsPromises.readFile(
                path.resolve(
                  __dirname,
                  "src",
                  "translations",
                  "packs",
                  translationFile
                ),
                "utf-8"
              )
            )
          : {};
        await compilePack(src, dest, {
          log: true,
          transformEntry: grooveLanguage
            ? (document) => {
                transformGrooveEntry(document, grooveLanguage, translations);
              }
            : sessionLanguage
              ? (document) => {
                  transformSessionEntry(document, sessionLanguage, translations);
                }
            : undefined,
        });
      }
    },
  };
}

function updateModuleManifestPlugin(kind: string = "module"): Plugin {
  return {
    name: "update-module-manifest",
    async writeBundle(): Promise<void> {
      const packageContents = JSON.parse(
        await fsPromises.readFile("./package.json", "utf-8")
      ) as Record<string, unknown>;
      const version = moduleVersion || (packageContents.version as string);
      const manifestContents: string = await fsPromises.readFile(
        `src/${kind}.json`,
        "utf-8"
      );
      const manifestJson = JSON.parse(manifestContents) as Record<
        string,
        unknown
      >;
      manifestJson["version"] = version;
      if (githubProject) {
        const baseUrl = `https://github.com/${githubProject}/releases`;
        manifestJson["manifest"] = `${baseUrl}/latest/download/${kind}.json`;
        if (githubTag) {
          manifestJson[
            "download"
          ] = `${baseUrl}/download/${githubTag}/${kind}.zip`;
        }
      }
      await fsPromises.writeFile(
        `dist/${kind}.json`,
        JSON.stringify(manifestJson, null, 4)
      );
    },
  };
}

function conditionalCopyPlugin(kind: string = "module"): Plugin {
  console.log(`kind: ${kind}`);
  return {
    name: "conditional-copy-plugin",
    // `closeBundle`, not `writeBundle`: Rollup runs `writeBundle` hooks in
    // parallel, so copying `dist` from there could start before the templates,
    // the languages or the packs had finished landing in it. `closeBundle` runs
    // once every one of them is done.
    async closeBundle(): Promise<void> {
      if (!foundryPath) {
        console.log(
          "FOUNDRY_PATH is not defined -> Skip internal test release."
        );
        return;
      }

      const sourceFolder = path.resolve(__dirname, "dist");
      const destinationFolder = path.join(foundryPath, `Data/${kind}s`);

      if (!(await fs.pathExists(destinationFolder))) {
        console.log(
          `Destination folder does not exist: ${destinationFolder} -> Skip internal test release.`
        );
        return;
      }

      const manifestJson = JSON.parse(
        await fsPromises.readFile(`src/${kind}.json`, "utf-8")
      ) as Record<string, unknown>;

      const destination = path.join(
        destinationFolder,
        manifestJson["id"] as string
      );
      const packs = path.join(sourceFolder, "packs");

      // Tout sauf les compendiums, et sans filet : si le code n'atteint pas
      // Foundry, le build doit tomber plutôt que d'imprimer une ligne rouge et
      // rendre la main comme si de rien n'était.
      await fs.copy(sourceFolder, destination, {
        filter: (from: string) =>
          from !== packs && !from.startsWith(packs + path.sep),
      });
      console.log("Folder copied successfully.");

      await copyPacks(packs, path.join(destination, "packs"));
    },
  };
}

/**
 * Les compendiums, à part, et sans faire tomber le build.
 *
 * Un pack est une base LevelDB que Foundry tient ouverte tant qu'il tourne :
 * Windows refuse alors d'en effacer les fichiers, et y parvenir serait pire -
 * échanger la base sous une instance vivante, c'est risquer de la corrompre. Un
 * build pendant une partie livre donc le code et laisse les compendiums en
 * place, ce qui est le comportement voulu et pas un pis-aller.
 *
 * Copiés séparément du reste parce que `fs.copy` parcourt l'arborescence en
 * parallèle : quand les packs échouaient au milieu de la même copie, les
 * branches encore en vol étaient abandonnées sans un mot. C'est ainsi qu'un
 * fichier de langue pouvait ne jamais arriver, un build sur deux.
 */
async function copyPacks(source: string, destination: string): Promise<void> {
  if (!(await fs.pathExists(source))) return;

  try {
    const packs = await fsPromises.readdir(source, { withFileTypes: true });
    await fs.ensureDir(destination);
    for (const pack of packs) {
      if (!pack.isDirectory()) continue;
      await replacePackDirectory(
        path.join(source, pack.name),
        path.join(destination, pack.name)
      );
    }
    console.log("Packs copied successfully.");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EBUSY" && code !== "EPERM") throw err;

    // Garder un ancien pack alimenté pendant que Foundry tourne est acceptable.
    // En revanche, un pack que le manifeste vient d'annoncer peut avoir été
    // créé vide par Foundry avant ce build. Le traiter comme « inchangé » rend
    // alors un faux succès : c'est exactement le cas d'un nouveau compendium
    // visible dans l'interface mais sans aucun document.
    const emptyPacks: string[] = [];
    const compiledPacks = await fsPromises.readdir(source, {
      withFileTypes: true,
    });
    for (const pack of compiledPacks) {
      if (!pack.isDirectory()) continue;

      const installed = path.join(destination, pack.name);
      const entries = await fsPromises.readdir(installed).catch(() => []);
      const dataFiles = entries.filter((entry) => entry.endsWith(".ldb"));
      const sizes = await Promise.all(
        dataFiles.map(async (entry) =>
          (await fsPromises.stat(path.join(installed, entry))).size
        )
      );
      if (!sizes.some((size) => size > 0)) emptyPacks.push(pack.name);
    }

    if (emptyPacks.length > 0) {
      throw new Error(
        `Foundry tient les compendiums ouverts et les packs installés suivants sont vides : ${emptyPacks.join(
          ", "
        )}. Ferme Foundry puis relance le build.`
      );
    }

    console.warn(
      "Foundry tient les compendiums ouverts -> code, gabarits et langues copiés, compendiums inchangés.\n" +
        "  Ferme Foundry et relance le build seulement si tu as touché a src/packs/."
    );
  }
}
