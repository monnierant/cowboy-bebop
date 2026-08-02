import { moduleId } from "../../constants";
import { getActivePrime, getPosterPosition, posterOptions } from "../../prime";

const ApplicationV2 = (foundry as any).applications.api.ApplicationV2;

const escapeHtml = (value: unknown): string =>
  (foundry as any).utils.escapeHTML(String(value ?? ""));

// The wanted poster. Who the table is hunting is the one fact that should never
// need a window opened to be recalled, so it hangs on the screen rather than
// living on a sheet somebody has to think to consult.
//
// It only ever names the *active* prime: the point is "this is the one", and a
// board of every prime in the world would say nothing.
export default class PrimePoster extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "cowboy-prime-poster",
    classes: ["cowboy-prime-poster"],
    window: { frame: false, positioned: false },
    actions: {},
  };

  static #instance: PrimePoster | null = null;

  static get instance(): PrimePoster {
    PrimePoster.#instance ??= new PrimePoster();
    return PrimePoster.#instance;
  }

  async _renderHTML(): Promise<string> {
    if (getPosterPosition() === "hidden") return "";

    const prime = getActivePrime();
    if (!prime) return "";

    // Two independent switches, and both off is a legitimate answer: it is how
    // a GM keeps a prime in play while its identity is still a secret.
    const { showImage, showName } = posterOptions(prime);
    if (!showImage && !showName) return "";

    const label = (key: string) =>
      (game as any).i18n?.localize(`COWBOY.poster.${key}`) ?? key;

    const image = showImage
      ? `<img class="cowboy-poster-image" src="${escapeHtml(prime.img)}" ` +
        `alt="${escapeHtml(prime.name)}" />`
      : "";

    const name = showName
      ? `<div class="cowboy-poster-name">${escapeHtml(prime.name)}</div>`
      : "";

    return (
      `<div class="cowboy-poster-card">` +
      `<div class="cowboy-poster-banner">${label("wanted")}</div>` +
      image +
      name +
      `</div>`
    );
  }

  _replaceHTML(result: string, content: HTMLElement): void {
    content.innerHTML = result;
    // An empty poster must not sit on the canvas as an invisible click-blocker.
    content.classList.toggle("cowboy-poster-empty", result === "");

    // The position is a class rather than inline styles so the stylesheet owns
    // the whole layout: an edge poster and a corner poster are different shapes,
    // not the same shape at different coordinates.
    content.classList.forEach((existing) => {
      if (existing.startsWith("cowboy-poster-at-")) {
        content.classList.remove(existing);
      }
    });
    content.classList.add(`cowboy-poster-at-${getPosterPosition()}`);
  }
}

/**
 * Keeps the poster truthful. The prime it names can be renamed, given another
 * portrait, or have its poster switches flipped from a sheet on any client.
 */
export function registerPrimePoster(): void {
  Hooks.on("updateActor", (actor: any) => {
    // Cheap and blunt: only the active prime can be on the poster, so anything
    // else changing is none of its business.
    if (actor?.id === getActivePrime()?.id) PrimePoster.instance.render(true);
  });

  // A deleted prime leaves the setting pointing at nothing, which getActivePrime
  // already reads as "no prime" - the poster just has to be told to look again.
  Hooks.on("deleteActor", (actor: any) => {
    if (actor?.type === "prime") PrimePoster.instance.render(true);
  });

  Hooks.once("ready", () => {
    // Published so the settings' onChange can redraw it without importing it.
    (ui as any).cowboyPrimePoster = PrimePoster.instance;
    PrimePoster.instance.render(true);
    console.log(`${moduleId} | prime poster ready`);
  });
}
