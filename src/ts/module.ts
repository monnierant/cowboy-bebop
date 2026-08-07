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
import { migrateTraitDamageNames } from "./migrations";
import { Settlement } from "./types";
import {
  actCorrectByCounter,
  actCorrectByTrait,
  actPlayRiff,
  actStake,
  actRewriteDie,
  actRerollRemovedDie,
  actReservePlan,
  actVoidNote,
  mayAct,
  settleUpdate,
  testOf,
} from "./apps/rolls/testCard";
import { expireActivations } from "./grooves";
import { getActivePrime } from "./prime";
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
    `systems/${moduleId}/templates/partials/correction-terms.hbs`,
    `systems/${moduleId}/templates/partials/mono-traits.hbs`,
    `systems/${moduleId}/templates/partials/groove-slot.hbs`,
    `systems/${moduleId}/templates/partials/activation-editor.hbs`,
    `systems/${moduleId}/templates/partials/activation-list.hbs`,
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
  void migrateTraitDamageNames();
});

// Une activation de portée « test » est consommée par la première carte qui
// l'a effectivement lue. L'écriture appartient à Big Shot : exactement un
// client, le MJ actif, fait donc le ménage même quand le jet vient d'un joueur.
Hooks.on("createChatMessage", (message: any) => {
  const user = (game as any).user;
  const activeGM = (game as any).users?.activeGM;
  if (!user?.isGM || (activeGM && activeGM !== user)) return;

  const state = testOf(message);
  const used = [
    ...(state?.activations ?? []),
    ...(state?.running ?? []),
  ]
    .filter((activation: any) => activation.scope === "test")
    .map((activation: any) => activation.grooveId)
    .filter(Boolean);
  if (used.length > 0) void expireActivations(getActivePrime(), "test", used);
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

  const card = document.createElement("div");
  card.innerHTML = message.content;
  const actions = card.querySelector(".cowboy-roll-actions");
  if (actions) actions.outerHTML = banner;
  else
    card
      .querySelector(".dice-result")
      ?.insertAdjacentHTML("beforeend", banner);

  await message.update({ content: card.innerHTML, ...settleUpdate(message) });
}

/**
 * Ce que ce lecteur-ci peut faire de la carte qu'il a sous les yeux.
 *
 * Le contenu est cuit une fois, par celui qui a lancé, et tout le monde lit le
 * même HTML : ce qui dépend de *qui lit* se retire donc ici. Deux règles
 * différentes, et c'est voulu - collecter écrit sur la prime, ce qu'aucun joueur
 * ne peut faire, tandis que corriger appartient au chasseur autant qu'à Big
 * Shot. Un spectateur voit les corrections, grisées : il suit la scène sans
 * pouvoir y toucher.
 */
function gateActions(message: any, html: HTMLElement): void {
  // Tout MJ collecte, pas seulement celui que Foundry désigne.
  //
  // `users.activeGM` n'en élit qu'un parmi les MJ connectés : le second - un
  // onglet de test, une session pas encore expirée - se retrouvait devant une
  // carte sans bouton, sans rien pour le lui dire. Cette élection sert à confier
  // une tâche automatique à exactement un client ; collecter est un clic
  // délibéré, et l'ADR 0007 a tranché dans ce sens pour les corrections. La
  // double collecte reste empêchée par la réécriture de la carte, qui retire le
  // bouton chez tout le monde d'un coup.
  if (!(game as any).user?.isGM) {
    html
      .querySelectorAll(".cowboy-roll-action-gm")
      .forEach((button) => button.remove());
  }

  if (mayAct(message)) return;

  html
    .querySelectorAll(".cowboy-roll-action:not(.cowboy-roll-action-gm)")
    .forEach((el) => {
      const button = el as HTMLButtonElement;
      button.disabled = true;
      button.title = (game as any).i18n.localize(
        "COWBOY.roll.actions.notYours"
      );
    });
}

Hooks.on(
  "renderChatMessageHTML",
  (message: any, html: HTMLElement, _data: any): void => {
    if (!testOf(message)) {
      // Une carte d'un ancien log ne porte pas l'état de son test : elle ne peut
      // plus rien faire, autant qu'elle cesse de le proposer.
      html.querySelector(".cowboy-roll-actions")?.remove();
      return;
    }

    gateActions(message, html);

    html.querySelectorAll(".cowboy-roll-action").forEach((element) => {
      element.addEventListener("click", async (event: Event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const datas = button.dataset;
        const actor: CowboyBebopActor = (game as any).actors?.get(datas.actorId);

        // L'état est relu sur le message à chaque geste, jamais sur ce HTML :
        // deux personnes agissent sur la même carte, donc celle qu'on a sous
        // les yeux peut avoir déjà bougé chez l'autre.
        button.disabled = true;
        try {
          switch (datas.action) {
            case "correct-pay":
              await actCorrectByCounter(
                message,
                actor,
                Number.parseInt(datas.choice ?? "0")
              );
              break;
            case "play-riff":
              await actPlayRiff(
                message,
                actor,
                datas.riff ?? "",
                Number.parseInt(datas.choice ?? "0")
              );
              break;
            case "damage-trait":
              await actCorrectByTrait(message, actor, datas.traitKey ?? "");
              break;
            case "stake-trait":
              await actStake(message, actor, datas.traitKey ?? "");
              break;
            case "void-note":
              // Aucun acteur : rien n'est débité nulle part, c'est la carte
              // seule qui bouge.
              await actVoidNote(message);
              break;
            case "rewrite-die":
              await actRewriteDie(message, Number.parseInt(datas.dieIndex ?? "-1"));
              break;
            case "reroll-removed-die":
              await actRerollRemovedDie(message);
              break;
            case "reserve-plan":
              await actReservePlan(message, actor, Number.parseInt(datas.dieIndex ?? "-1"));
              break;
            case "collect": {
              const settled = await actor?.actionCollect(
                datas.genre ?? "",
                Number.parseInt(datas.cartons ?? "0"),
                Number.parseInt(datas.notes ?? "0")
              );
              if (settled) await settleCard(message, settled);
              break;
            }
          }
        } finally {
          button.disabled = false;
        }
      });
    });
  }
);
