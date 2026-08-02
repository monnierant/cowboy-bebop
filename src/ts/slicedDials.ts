import { colors, genres, moduleId } from "./constants";
import { anyoneCanPay, Sign } from "./economy";
import { openSliceDialog } from "./apps/dialog/cowboybebopSliceDialog";
import { getActivePrime, primeOfDial } from "./prime";

// Everything this system has to say to Sliced Dials lives here.
//
// The division of labour: the module owns the dials, their drawing and the
// permission to write to them. This system owns the economy - the tokens and
// false notes a roll produces, who holds them, and what a slice costs.

export const RULESET = moduleId;

type Slice = { sign: Sign; category: string };

function api(): any {
  return (game as any).modules?.get("sliced-dials")?.api;
}

/** Ours to answer for, or another system's dial that happens to be on screen. */
function isOurs(dial: any): boolean {
  return dial?.system?.ruleset === RULESET;
}

export function registerSlicedDials(): void {
  Hooks.on("slicedDials.register" as any, (registry: any) => {
    registry.registerRuleset({
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
      // it. It cannot ask about a payer - it has no idea slices are paid for -
      // so all this can answer is whether *anyone* could. The dialog below is
      // where a particular payer's empty pocket greys out a particular button.
      validate: (dial: any, slice: Slice) =>
        anyoneCanPay(dial, slice.sign, slice.category)
          ? { ok: true }
          : {
              ok: false,
              reason: `No ${slice.category} left to spend.`,
            },
    });
  });

  // Taking over the click. Returning false is the module's convention for "I am
  // handling this", and it is what keeps its own picker from opening: that
  // picker asks which slice, and this system also has to ask whose.
  Hooks.on("slicedDials.sliceIntent" as any, (dial: any) => {
    if (!isOurs(dial)) return true;

    const module = api();
    if (!module) return true;

    void openSliceDialog(module, dial);
    return false;
  });

  // Combat is about the hunt in progress, not the GM's whole library. The
  // module already applies permissions; the system adds its domain rule: only
  // in-play dials linked to the one active prime belong in this tracker.
  Hooks.on("slicedDials.filterCombatDial" as any, (dial: any) => {
    if (!isOurs(dial)) return true;

    const active = getActivePrime();
    return (
      dial.system?.state === "active" &&
      !!active &&
      primeOfDial(dial)?.id === active.id
    );
  });
}
