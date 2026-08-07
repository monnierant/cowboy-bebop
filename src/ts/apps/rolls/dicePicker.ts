/**
 * Choisir un dé du jet, dans une boîte plutôt que sur la carte.
 *
 * Un dé se désigne à l'œil : on veut voir le jet tel qu'il est tombé, et
 * pointer une face. La carte, elle, est dense et partagée par toute la table -
 * y aligner un bouton par dé éligible la noyait, et cachait quel geste on était
 * en train de faire.
 *
 * D'où cette boîte, commune à tous les gestes qui portent sur un dé. Elle
 * montre **tout** le groupement, y compris les faces sur lesquelles le geste ne
 * mord pas : un 1 grisé dit pourquoi il n'est pas proposé, là où son absence
 * laissait croire à un bug.
 *
 * Elle ne décide rien et ne paie rien : elle rend un rang, ou rien si on ferme.
 * Le prix et la règle restent chez l'appelant, qui relit l'état après coup - la
 * boîte laisse le temps à quelqu'un d'autre d'agir sur la même carte.
 */

const localize = (key: string): string =>
  (game as any)?.i18n?.localize(key) ?? key;

const escapeHtml = (value: unknown): string =>
  (foundry as any).utils.escapeHTML(String(value ?? ""));

/** Un dé tel que la boîte le présente : sa face, son rang, et s'il se clique. */
export interface PickableDie {
  face: number;
  index: number;
  eligible: boolean;
  /** Pourquoi celui-ci ne se clique pas, en infobulle. */
  hint?: string;
}

export interface DiePickerOptions {
  /** Le nom du groove ou du riff qui ouvre le geste. */
  title: string;
  /** Ce qu'on demande de choisir, en une phrase. */
  prompt: string;
  dice: PickableDie[];
  /** Marque la face que le dé prendra une fois le geste joué. */
  becomes?: number;
}

/**
 * Ouvre la boîte et rend le rang choisi, ou rien.
 *
 * Le rang - et non la face - parce que deux dés peuvent montrer le même
 * résultat : c'est celui qu'on a pointé qui doit bouger.
 */
export async function pickDie(options: DiePickerOptions): Promise<number | undefined> {
  if (!options.dice.some((die) => die.eligible)) return undefined;

  const faces = options.dice
    .map((die) => {
      const tooltip = die.eligible
        ? options.becomes !== undefined
          ? `${die.face} → ${options.becomes}`
          : ""
        : die.hint ?? "";

      return `<button type="button" class="cowboy-die-pick${die.eligible ? "" : " is-blocked"}"
        data-die-index="${die.index}"
        ${die.eligible ? "" : "disabled"}
        ${tooltip ? `data-tooltip="${escapeHtml(tooltip)}"` : ""}
      >${die.face}</button>`;
    })
    .join("");

  const content = `
    <div class="cowboy-die-picker">
      <p class="cowboy-die-picker-prompt">${escapeHtml(options.prompt)}</p>
      <div class="cowboy-die-picker-dice">${faces}</div>
    </div>`;

  return new Promise<number | undefined>((resolve) => {
    // Un seul verrou pour les deux sorties : `close` court aussi quand c'est le
    // clic sur un dé qui ferme la boîte, et rendrait `undefined` par-dessus le
    // rang choisi.
    let picked: number | undefined;

    const dialog = new Dialog({
      title: options.title,
      content,
      buttons: {
        cancel: {
          icon: '<i class="fa-solid fa-xmark"></i>',
          label: localize("COWBOY.roll.dice.cancel"),
        },
      },
      default: "cancel",
      render: (html: JQuery) => {
        html.find("button.cowboy-die-pick").on("click", (event) => {
          const index = Number.parseInt(
            String(event.currentTarget.dataset.dieIndex ?? "-1")
          );
          if (Number.isNaN(index) || index < 0) return;
          picked = index;
          dialog.close();
        });
      },
      close: () => resolve(picked),
    } as any);

    dialog.render(true);
  });
}
