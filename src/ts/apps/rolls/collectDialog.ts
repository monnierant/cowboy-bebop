/**
 * La boîte de collecte : où vont les jetons du test.
 *
 * Un résultat a deux destinations - les cadrans, ou le seuil du mouvement
 * (ADR 0015) - et elles se disputent la même poignée de jetons. Les proposer sur
 * la Carte demandait de dépenser *avant* la collecte, donc d'écrire dans un score
 * que la moindre relance recalcule : le carton dépensé revenait au premier Quitte
 * ou double. Ici, rien n'est écrit tant que la boîte n'est pas validée, et la
 * question ne se pose plus.
 *
 * La boîte ne connaît que le plan (`rolls/collectPlan.ts`) : un bouton par geste
 * qui réduit la collecte, l'écart avant → après, et ce qui reste à créditer. Elle
 * ne paie rien et n'écrit rien - elle rend un plan, ou rien si on ferme.
 */

import {
  CollectGesture,
  CollectOffer,
  CollectPlan,
  gestureBlocked,
  offeredGestures,
  openPlan,
  play,
} from "../../rolls/collectPlan";

const localize = (key: string): string =>
  (game as any)?.i18n?.localize(key) ?? key;

const escapeHtml = (value: unknown): string =>
  (foundry as any).utils.escapeHTML(String(value ?? ""));

export interface CollectDialogOptions {
  offer: CollectOffer;
  /** À qui reviennent les cartons, pour que la boîte le dise. */
  hunterName: string;
  /** À qui reviennent les fausses notes. */
  primeName: string;
}

/** Les trois gestes, dans l'ordre où la boîte les aligne. */
const gestures: {
  gesture: CollectGesture;
  icon: string;
  label: string;
  hint: string;
}[] = [
  {
    gesture: "spend-carton",
    icon: "fa-solid fa-arrow-down",
    label: "COWBOY.difficulty.spendCarton",
    hint: "COWBOY.difficulty.spendCartonHint",
  },
  {
    gesture: "spend-note",
    icon: "fa-solid fa-arrow-up",
    label: "COWBOY.difficulty.spendNote",
    hint: "COWBOY.difficulty.spendNoteHint",
  },
  {
    gesture: "buy-back",
    icon: "fa-solid fa-rotate-left",
    label: "COWBOY.difficulty.buyBack",
    hint: "COWBOY.difficulty.buyBackHint",
  },
];

const signed = (offset: number): string =>
  offset >= 0 ? `+${offset}` : String(offset);

const tokens = (count: number, icon: string, label: string): string =>
  count > 0
    ? `<span class="cowboy-collect-tokens" data-tooltip="${escapeHtml(label)}">${
        `<i class="fa-solid ${icon}"></i>`.repeat(count)
      }</span>`
    : "";

/**
 * Ce que la boîte montre du plan en cours.
 *
 * Redessiné à chaque geste plutôt que retouché : le plan est petit, et le
 * relire en entier évite qu'un compteur et une infobulle se contredisent.
 */
function body(plan: CollectPlan, options: CollectDialogOptions): string {
  const { offer } = options;

  const left =
    tokens(plan.cartons, "fa-music cowboy-carton", localize("COWBOY.actor.cartons")) +
    tokens(plan.notes, "fa-record-vinyl cowboy-note", localize("COWBOY.actor.notes")) ||
    `<em class="cowboy-collect-empty">${localize("COWBOY.roll.collect.nothingLeft")}</em>`;

  // L'infobulle dit ce que le geste fait quand il se clique, et pourquoi il ne
  // se clique pas quand il est barré : les deux répondent à la même question.
  const offered = offeredGestures(offer);
  const buttons = gestures
    .filter(({ gesture }) => offered.includes(gesture))
    .map(({ gesture, icon, label, hint }) => {
      const blocked = gestureBlocked(plan, offer, gesture);
      const tooltip = localize(blocked ?? hint);
      return `<button type="button" class="cowboy-collect-gesture"
        data-gesture="${gesture}"
        ${blocked ? "disabled" : ""}
        data-tooltip="${escapeHtml(tooltip)}"
      ><i class="${icon}"></i> ${escapeHtml(localize(label))}</button>`;
    })
    .join("");

  // L'écart n'est rappelé que s'il bouge : une collecte ordinaire n'a pas à
  // faire lire une ligne qui dit « rien n'a changé ».
  const offsetLine =
    plan.offset === offer.offset
      ? `${localize("COWBOY.difficulty.offset")} ${signed(offer.offset)}`
      : `${localize("COWBOY.difficulty.offset")} <s>${signed(offer.offset)}</s>
         <strong>${signed(plan.offset)}</strong>`;

  const credited = [
    plan.cartons > 0
      ? `${plan.cartons} × ${localize("COWBOY.actor.cartons")} → ${escapeHtml(options.hunterName)}`
      : "",
    plan.notes > 0
      ? `${plan.notes} × ${localize("COWBOY.actor.notes")} → ${escapeHtml(options.primeName)}`
      : "",
  ]
    .filter(Boolean)
    .join("<br />");

  return `
    <div class="cowboy-collect">
      <p class="cowboy-collect-left">${left}</p>
      <div class="cowboy-collect-gestures">${buttons}</div>
      <p class="cowboy-collect-offset">${offsetLine}</p>
      <p class="cowboy-collect-credited">${
        credited || `<em>${localize("COWBOY.roll.collect.nothingCredited")}</em>`
      }</p>
    </div>`;
}

/**
 * Ouvre la boîte et rend le plan validé, ou rien.
 *
 * Fermer sans valider ne laisse aucune trace : c'est ce qui tient lieu d'annuler
 * un geste. Un clic de trop se répare en rouvrant la boîte, et non en défaisant
 * pas à pas ce qu'aucun bouton n'aurait su défaire sans ambiguïté (le rachat
 * n'est pas l'inverse d'une dépense).
 */
export async function planCollect(
  options: CollectDialogOptions
): Promise<CollectPlan | undefined> {
  let plan = openPlan(options.offer);

  return new Promise<CollectPlan | undefined>((resolve) => {
    // Un seul verrou pour les deux sorties, comme la boîte à dés : `close` court
    // aussi quand c'est le bouton de collecte qui ferme.
    let collected: CollectPlan | undefined;

    const dialog = new Dialog({
      title: localize("COWBOY.roll.actions.collect"),
      content: body(plan, options),
      buttons: {
        collect: {
          icon: '<i class="fa-solid fa-circle-plus"></i>',
          label: localize("COWBOY.roll.actions.collect"),
          callback: () => {
            collected = plan;
          },
        },
        cancel: {
          icon: '<i class="fa-solid fa-xmark"></i>',
          label: localize("COWBOY.roll.cancel"),
        },
      },
      default: "collect",
      render: (html: JQuery) => {
        const bind = () => {
          html.find("button.cowboy-collect-gesture").on("click", (event) => {
            const gesture = String(
              event.currentTarget.dataset.gesture ?? ""
            ) as CollectGesture;
            const after = play(plan, options.offer, gesture);
            if (after === plan) return;
            plan = after;
            html.find(".cowboy-collect").replaceWith(body(plan, options));
            bind();
          });
        };
        bind();
      },
      close: () => resolve(collected),
    } as any);

    dialog.render(true);
  });
}
