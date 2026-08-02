import { colors, genres } from "../../constants";
import { held, payersFor, spend, Sign } from "../../economy";

const { DialogV2 } = (foundry as any).applications.api;

// Sliced Dials asks which slice to place. This system has to ask something
// larger - which slice, and out of whose pocket - because false notes are held
// by each hunter rather than in one pot. That is the entire reason this dialog
// exists instead of the module's own picker.
//
// A grid says it in one screen: one row per payer, one column per genre, and the
// number of tokens on the button. False notes have one payer - the prime -
// while positive cartons offer one row for every hunter this user owns.

interface Cell {
  genre: string;
  held: number;
  /** Why this cell cannot be played, or empty if it can. */
  refusal: string;
}

interface Row {
  actorId: string;
  name: string;
  cells: Cell[];
}

function escape(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rowsFor(api: any, dial: any, sign: Sign): Row[] {
  const allowed: string[] = dial.system.allowedCategories?.length
    ? dial.system.allowedCategories
    : genres;

  const userId = (game as any).user?.id ?? "";

  return payersFor(dial, sign).map((actor: any) => ({
    actorId: actor.id,
    name: actor.name,
    cells: allowed.map((genre) => {
      const tokens = held(actor, sign, genre);

      // The dial's own constraints - locked, full, wrong sign, a reserved
      // closing category - are the module's to judge, so they are asked for
      // rather than reimplemented here. Only affordability is this system's.
      const verdict = api.canAddSlice(dial, {
        sign,
        category: genre,
        userId,
        at: Date.now(),
      });

      return {
        genre,
        held: tokens,
        refusal: tokens > 0 ? (verdict.ok ? "" : verdict.reason ?? "") : noneLeft(),
      };
    }),
  }));
}

function noneLeft(): string {
  return (
    (game as any).i18n?.localize("COWBOY.dials.noneLeft") ?? "Nothing to spend."
  );
}

// A sign is what the module stores; a carton or a false note is what the table
// spends. Nothing but the data layer has any use for "+" and "-", so this is
// the last point at which they are seen.
function currencyOf(sign: Sign): string {
  return (game as any).i18n?.localize(
    sign === "+" ? "COWBOY.actor.cartons" : "COWBOY.actor.notes"
  );
}

function costOf(sign: Sign, genre: string): string {
  return (game as any).i18n?.format(
    sign === "+" ? "COWBOY.dials.payCarton" : "COWBOY.dials.payNote",
    { genre }
  );
}

function renderRow(row: Row, sign: Sign, single: boolean): string {
  const buttons = row.cells
    .map((cell) => {
      const color = colors[cell.genre]?.on ?? "#7a7a7a";
      const icon = colors[cell.genre]?.fa ?? "fa-circle";

      // A genre is carried here by an icon and a colour alone, so the button
      // has to say which one in words. A refused cell says why instead: the
      // reason is the more useful of the two, and it names the genre anyway.
      const name = costOf(sign, cell.genre);

      return (
        `<button type="button" class="cowboy-slice-pick" ` +
        `data-sign="${sign}" data-genre="${escape(cell.genre)}" ` +
        `data-actor-id="${escape(row.actorId)}" ` +
        `style="border-color:${escape(color)}" ` +
        `aria-label="${escape(name)}" ` +
        (cell.refusal
          ? `disabled title="${escape(cell.refusal)}"`
          : `title="${escape(name)}"`) +
        `><i class="fa-solid ${escape(icon)}" style="color:${escape(color)}"></i>` +
        `<span class="cowboy-slice-pick-count">${cell.held}</span></button>`
      );
    })
    .join("");

  // With one payer the name is noise - it is the prime whose sheet is already
  // on screen, or the single character the player owns.
  const label = single ? "" : `<div class="cowboy-slice-payer">${escape(row.name)}</div>`;

  return `<div class="cowboy-slice-row">${label}<div class="cowboy-slice-cells">${buttons}</div></div>`;
}

/** The whole grid, as the dial and everyone's pockets stand right now. */
function grid(api: any, dial: any): string {
  const signs: Sign[] = dial.system.allowedSigns ?? ["+", "-"];

  return signs
    .map((sign) => {
      const rows = rowsFor(api, dial, sign);
      if (rows.length === 0) return "";

      const heading =
        signs.length > 1
          ? `<h3 class="cowboy-slice-sign">${escape(currencyOf(sign))}</h3>`
          : "";

      return (
        heading +
        rows.map((row) => renderRow(row, sign, rows.length === 1)).join("")
      );
    })
    .join("");
}

/**
 * Asks who pays for what, then places the slice and takes the token - and stays
 * open for the next one, since filling a dial is rarely one slice.
 *
 * The grid is redrawn from the dial and the actors after every placement, which
 * is what keeps the counts on the buttons honest: a payer who just spent their
 * last blues carton has to see that button go dead without waiting for a
 * refusal on the click after.
 *
 * The debit follows the placement rather than preceding it, so a placement the
 * module refuses costs nobody anything. The reverse order is the one that can
 * lose a token.
 */
export async function openSliceDialog(api: any, dial: any): Promise<void> {
  if (!grid(api, dial)) {
    ui.notifications?.warn(
      (game as any).i18n?.localize("COWBOY.dials.noPayer") ??
        "Nobody can pay for a slice on this dial."
    );
    return;
  }

  const dialog = new DialogV2({
    window: { title: dial.name },
    classes: ["cowboy-bebop", "cowboy-slice-dialog"],
    content: `<div class="cowboy-slice-grid"></div>`,
    buttons: [
      {
        action: "close",
        label: (game as any).i18n?.localize("COWBOY.dials.close") ?? "Close",
      },
    ],
  });

  await dialog.render({ force: true });

  const body = dialog.element?.querySelector(
    ".cowboy-slice-grid"
  ) as HTMLElement | null;
  if (!body) return;

  const paint = (): void => {
    body.innerHTML = grid(api, dial);

    body
      .querySelectorAll<HTMLButtonElement>(".cowboy-slice-pick")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const sign = button.dataset.sign as Sign;
          const genre = button.dataset.genre!;
          const payer = (game as any).actors?.get(button.dataset.actorId);
          if (!payer) return;

          const verdict = await api.addSlice(dial, { sign, category: genre });
          if (!verdict.ok) {
            ui.notifications?.warn(verdict.reason ?? "Refused");
            return;
          }

          await spend(payer, sign, genre);
          paint();
        });
      });
  };

  paint();
}
