import { colors, genres, moduleId } from "./constants";

// Everything this system has to say to Sliced Dials lives here.
//
// The division of labour: the module owns the dials, their drawing and the
// placement interaction. This system owns the economy - the tokens and false
// notes a roll produces, and what a slice costs.

export const RULESET = moduleId;

// A dial the players fill with tokens is an objective; a dial the GM fills with
// false notes is a threat. In the module's terms that is simply which sign the
// dial accepts, so both kinds are the same document with one field differing.
const POOL_OF: Record<string, "cartons" | "notes"> = {
  "+": "cartons",
  "-": "notes",
};

type Slice = { sign: "+" | "-"; category: string };

function poolFor(dial: any, slice: Slice): number {
  // Tokens live on the prime the dial hangs off. A dial with no prime - one
  // created at world level - has no pool to draw on.
  const prime = dial?.parent;
  if (!prime) return Number.POSITIVE_INFINITY;

  return prime.system?.[POOL_OF[slice.sign]]?.[slice.category] ?? 0;
}

export function registerSlicedDials(): void {
  Hooks.on("slicedDials.register" as any, (api: any) => {
    api.registerRuleset({
      id: RULESET,
      categories: Object.fromEntries(
        genres.map((genre) => [
          genre,
          {
            label: genre,
            color: colors[genre].on,
            icon: `fa-solid ${colors[genre].fa}`,
          },
        ])
      ),

      // The module asks this before offering a slice and again before writing
      // it, so an empty pool greys the button out with a reason rather than
      // failing after the click.
      validate: (dial: any, slice: Slice) =>
        poolFor(dial, slice) > 0
          ? { ok: true }
          : { ok: false, reason: `No ${slice.category} left to spend.` },
    });
  });

  // Settling up happens after the slice has landed. The validator above has
  // already refused anything the pool could not pay for, so this cannot take a
  // pool below zero.
  Hooks.on("slicedDials.slicePlaced" as any, async (dial: any, slice: Slice) => {
    const prime = dial?.parent;
    if (!prime) return;

    const pool = POOL_OF[slice.sign];
    const current = prime.system?.[pool]?.[slice.category];
    if (typeof current !== "number") return;

    await prime.update({
      [`system.${pool}.${slice.category}`]: Math.max(0, current - 1),
    });
  });
}
