import { moduleId, genres, rangs } from "../../constants";
// import { Traits, Trait } from "../../types";
import CowboyBebopActor from "../documents/cowboybebopActor";
import { RULESET } from "../../slicedDials";

export default class CowboyBebopItemSheet extends ActorSheet {
  private genreSelected: string | undefined = undefined;
  private typeSelected: string | undefined = undefined;

  // Define the template to use for this sheet
  override get template() {
    return `systems/${moduleId}/templates/sheets/actor/actor-sheet-${this.actor.type}.hbs`;
  }

  // Data to be passed to the template when rendering
  override async getData() {
    let data: any = super.getData();
    data.isGM = (game as Game).user?.isGM;
    data.genres = genres;
    data.rangs = rangs;
    data.genreSelected = this.genreSelected; // To remove when will be used to fill a cadran
    data.typeSelected = this.typeSelected; // to remove when will be used to fill a cadran
    return data;
  }

  // Event Listeners
  override activateListeners(html: JQuery) {
    super.activateListeners(html);
    // Roll handlers, click handlers, etc. would go here.
    html.find(".cowboy-actor-roll").on("click", this._onRollDice.bind(this));

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    switch (this.actor.type) {
      case "chasseur":
        this.activateListenersPC(html);
        break;
      case "prime":
        this.activateListenersNPC(html);
        break;
    }
  }

  private activateListenersPC(html: JQuery) {
    html
      .find(".cowboy-admin-action-health")
      .on("click", this._onDamage.bind(this));

    html
      .find(".cowboy-actor-trait-name")
      .on("change", this._onRenameTrait.bind(this));

    html
      .find(".cowboy-actor-trait-damaged")
      .on("change", this._onDamageTrait.bind(this));

    html
      .find(".cowboy-admin-action-restore")
      .on("click", this._onRestore.bind(this));
  }

  private activateListenersNPC(html: JQuery) {
    html.find(".cowboy-dials-add").on("click", this._onAddDial.bind(this));
    this._mountDials(html);
    html
      .find(".cowboy-prime-current-target-button")
      .on("click", this._onSetCurrent.bind(this));
    html
      .find(".cowboy-actor-token")
      .on("click", this._onSelectToken.bind(this));
    html
      .find(".cowboy-prime-genre")
      .on("change", this._onSelectGenre.bind(this));
    html
      .find(".cowboy-prime-mouvement")
      .on("change", this._onSelectMouvement.bind(this));
    html
      .find(".cowboy-prime-tokens-add")
      .on("click", this._onAddToken.bind(this));
  }

  // ========================================
  // PC Actions
  // ========================================

  // Handle damage
  private async _onDamage(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const points = parseInt(
      (event.currentTarget as HTMLElement).getAttribute("data-value") || "0"
    );
    await (this.actor as CowboyBebopActor).updateCartridge(points);
  }

  // Restore Traits
  private async _onRestore(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    await (this.actor as CowboyBebopActor).restoreTraits();
  }

  // Rename Trait
  private async _onRenameTrait(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    // Recup all the data from the event
    const name = (event.currentTarget as HTMLInputElement).value;
    const traitId = parseInt(
      (event.currentTarget as HTMLInputElement).dataset.index ?? "0"
    );
    const traitCategoryId = (event.currentTarget as HTMLInputElement).dataset
      .category;

    // Check if the data is valid
    if (traitCategoryId === undefined || traitId === undefined) return;

    // Save the new data
    await (this.actor as CowboyBebopActor).renameTrait(
      traitCategoryId,
      traitId,
      name
    );
  }

  // Damaged Trait
  private async _onDamageTrait(event: Event, hyperDamaged: boolean = false) {
    event.preventDefault();
    event.stopPropagation();
    // Recup all the data from the event
    const isDamaged = (event.currentTarget as HTMLInputElement).checked;
    const traitId = parseInt(
      (event.currentTarget as HTMLElement).dataset.index ?? "0"
    );
    const traitCategoryId = (event.currentTarget as HTMLElement).dataset
      .category;

    // Check if the data is valid
    if (traitCategoryId === undefined || traitId === undefined) return;

    // Save the new data
    await (this.actor as CowboyBebopActor).damageTrait(
      traitCategoryId,
      traitId,
      isDamaged,
      hyperDamaged
    );
  }

  // Roll Dice
  private async _onRollDice(event: Event) {
    console.log("Rolling dice");
    event.preventDefault();
    // event.stopPropagation();
    // Recup all the data from the event
    const traitCategoryId = (event.currentTarget as HTMLElement).dataset
      .category;

    // Check if the data is valid
    if (traitCategoryId === undefined) return;

    // Save the new data
    await (this.actor as CowboyBebopActor).prepareDicePool(traitCategoryId);
  }

  //=============================================
  // NPC Actions
  //=============================================

  /**
   * Hands the dial container over to the module, which draws them and wires
   * the whole placement interaction. This system never draws a dial itself -
   * that is the point of depending on the module.
   */
  private _mountDials(html: JQuery) {
    const container = html.find(".cowboy-prime-dials").get(0);
    if (!container) return;

    const api = (game as any).modules?.get("sliced-dials")?.api;
    if (!api) {
      // The manifest declares the dependency, so this only happens if someone
      // disabled the module in an existing world.
      container.innerHTML = `<p class="notification warning">Sliced Dials is not active.</p>`;
      return;
    }

    api.mountDials(container, this.actor);
  }

  /**
   * Creates a dial embedded on this prime. Objective dials take tokens,
   * threat dials take false notes - which in the module's terms is simply the
   * sign each one accepts.
   */
  private async _onAddDial(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const size = parseInt(button.dataset.size ?? "4");
    const objective = button.dataset.goal === "true";

    const created = await Item.create(
      {
        name: objective
          ? (game as any).i18n.localize("COWBOY.actor.goal")
          : (game as any).i18n.localize("COWBOY.actor.threat"),
        type: "sliced-dials.dial",
        system: {
          size,
          ruleset: RULESET,
          allowedSigns: [objective ? "+" : "-"],
        },
      } as any,
      { parent: this.actor } as any
    );

    (created as any)?.sheet?.render(true);
  }

  private _onSetCurrent(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    (this.actor as CowboyBebopActor).setCurrentTarget();
  }

  private _onSelectToken(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const tokenClicked = event.currentTarget as HTMLElement;
    const parent = tokenClicked?.parentElement?.parentElement;
    if (!parent) return;

    this.genreSelected = tokenClicked.dataset.genre;
    this.typeSelected = tokenClicked.dataset.type;

    const elements = Array.from(
      parent.getElementsByClassName("cowboy-actor-token")
    );

    elements.forEach((element: Element) => {
      element.classList.remove("cowboy-actor-token-selected");
    });

    elements
      .filter((element: Element) => element === tokenClicked)
      .forEach((element: Element) => {
        element.classList.add("cowboy-actor-token-selected");
      });
  }

  private async _onSelectGenre(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const genre = (event.currentTarget as HTMLInputElement).value;

    await (this.actor as CowboyBebopActor).setGenre(genre ?? "");
  }

  private async _onSelectMouvement(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const mouvement = parseInt(
      (event.currentTarget as HTMLInputElement).value ?? "0"
    );

    await (this.actor as CowboyBebopActor).setMouvement(mouvement);
  }

  private async _onAddToken(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const value = parseInt(
      (event.currentTarget as HTMLElement).dataset.value ?? "0"
    );

    await (this.actor as CowboyBebopActor).addToken(
      this.genreSelected ?? "",
      this.typeSelected ?? "",
      value
    );
  }
}
