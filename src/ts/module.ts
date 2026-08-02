// Do not remove this import. If you do Vite will think your styles are dead
// code and not include them in the build output.
import "../styles/style.scss";

// import DogBrowser from "./apps/dogBrowser";
import CowboyBebopItemSheet from "./apps/sheets/cowboybebopItemSheet";
import CowboyBebopActorSheet from "./apps/sheets/cowboybebopActorSheet";
import CowboyBebopActor from "./apps/documents/cowboybebopActor";
import { moduleId } from "./constants";
import { range } from "./handlebarsHelpers/range";
import { genreToIcon } from "./handlebarsHelpers/genreToIcon";
import { registerSlicedDials } from "./slicedDials";
import {
  migrateDialSignConvention,
  registerPrimeHooks,
  registerPrimeSettings,
} from "./prime";
import { registerPrimePoster } from "./apps/hud/PrimePoster";
import { Settlement } from "./types";
// import CowboyBebopRoll from "./apps/rolls/cowboybebopRoll";
// import CowboyBebopResultRollMessageData from "./apps/messages/cowboybebopResultRollMessageData";

async function preloadTemplates(): Promise<any> {
  const templatePaths = [
    `systems/${moduleId}/templates/partials/rythm-counter.hbs`,
    `systems/${moduleId}/templates/partials/health-counter.hbs`,
    `systems/${moduleId}/templates/partials/actor-admin-panel.hbs`,
    `systems/${moduleId}/templates/partials/token-counter.hbs`,
    `systems/${moduleId}/templates/partials/riff-list.hbs`,
    `systems/${moduleId}/templates/partials/riff-editor.hbs`,
  ];

  return loadTemplates(templatePaths);
}

Hooks.once("init", () => {
  console.log(`Initializing ${moduleId}`);

  Handlebars.registerHelper("range", range);
  Handlebars.registerHelper("genreToIcon", genreToIcon);

  // `circlePortion` and `divide` existed only to draw the old dial partial by
  // hand. The module owns that drawing now.

  CONFIG.Actor.documentClass = CowboyBebopActor;
  // CONFIG.ChatMessage.dataModels.rollMessage = CowboyBebopResultRollMessageData;

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(moduleId, CowboyBebopItemSheet, { makeDefault: true });

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(moduleId, CowboyBebopActorSheet, { makeDefault: true });

  registerPrimeSettings();
  registerPrimeHooks();
  registerPrimePoster();
  registerSlicedDials();

  preloadTemplates();
});

Hooks.once("ready", () => {
  void migrateDialSignConvention();
});

/**
 * Leaves the settled roll in the log instead of erasing it.
 *
 * The card is edited in place: the dice keep their position in the
 * conversation, and the actions - which no longer have anything to act on -
 * give way to an account of where the tokens went. Editing rather than posting
 * a second message is what stops a settled roll from being collected twice,
 * since the button is gone for every client at once.
 */
async function settleCard(message: any, settled: Settlement): Promise<void> {
  const banner = await renderTemplate(
    `systems/${moduleId}/templates/chat/roll-collected.hbs`,
    settled
  );

  const card = $(`<div>${message.content}</div>`);
  const actions = card.find(".cowboy-roll-actions");
  if (actions.length) actions.replaceWith(banner);
  else card.find(".dice-result").append(banner);

  await message.update({ content: card.html() });
}

Hooks.on(
  "renderChatMessage",
  (message: any, html: JQuery, data: any): void => {
    // The card's content is baked once, by whoever rolled, and every client
    // reads the same HTML. Anything that depends on *who is reading* therefore
    // has to be taken out here rather than skipped at render.
    const user = (game as any).user;
    const activeGM = (game as any).users?.activeGM;
    if (!user?.isGM || (activeGM && activeGM !== user)) {
      html.find(".cowboy-roll-action-gm").remove();
    }

    html.find(".cowboy-roll-action").on("click", async (event: Event) => {
      const datas = (event.currentTarget as HTMLElement).dataset;
      const actor: CowboyBebopActor = (game as any).actors?.get(datas.actorId);
      switch (datas.action) {
        case "damage-cartridge":
          actor?.actionDamageCartridge(
            html,
            event.currentTarget as HTMLInputElement,
            parseInt(datas.rollid ?? "0")
          );
          break;
        case "damage-trait":
          actor?.actionDamageTrait(
            html,
            event.currentTarget as HTMLInputElement,
            parseInt(datas.rollid ?? "0"),
            datas.category ?? "",
            datas.trait ?? ""
          );
          break;
        case "hyper-damage-trait":
          actor?.actionHyperDamageTrait(
            html,
            event.currentTarget as HTMLInputElement,
            parseInt(datas.rollid ?? "0"),
            datas.category ?? "",
            datas.trait ?? ""
          );
          break;
        case "collect":
          // The hunter who rolled settles up for both currencies: the cartons
          // land on their own sheet, the notes are forwarded to whichever
          // prime is in play. The roll object only exists in the rolling
          // player's memory, so the GM rewrites the shared chat document
          // rather than trying to reach that private object by its local
          // array index.
          (event.currentTarget as HTMLButtonElement).disabled = true;
          const settled = await actor?.actionCollect(
            datas.genre ?? "",
            parseInt(datas.cartons ?? "0"),
            parseInt(datas.notes ?? "0")
          );
          if (settled) await settleCard(message, settled);
          else (event.currentTarget as HTMLButtonElement).disabled = false;
          break;
      }
    });

    if (!message) return;
    if (!data) return;
  }
);
