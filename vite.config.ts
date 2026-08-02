import * as fsPromises from "fs/promises";
import copy from "rollup-plugin-copy";
import scss from "rollup-plugin-scss";
import { defineConfig, Plugin } from "vite";
import path from "path";
import fs from "fs-extra";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

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
        const src = path.resolve(__dirname, "src", "packs", pack.name);
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
        await compilePack(src, dest, { log: true });
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

      try {
        const manifestContents: string = await fsPromises.readFile(
          `src/${kind}.json`,
          "utf-8"
        );
        const manifestJson = JSON.parse(manifestContents) as Record<
          string,
          unknown
        >;

        const exists = await fs.pathExists(destinationFolder);
        if (exists) {
          await fs.copy(
            sourceFolder,
            path.join(destinationFolder, manifestJson["id"] as string)
          );
          console.log("Folder copied successfully.");
        } else {
          console.log(
            `Destination folder does not exist: ${destinationFolder} -> Skip internal test release.`
          );
        }
      } catch (err) {
        console.error(err);
      }
    },
  };
}
