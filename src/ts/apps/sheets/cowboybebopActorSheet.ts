import {
  moduleId,
  genres,
  mouvements,
  primeFlag,
  colors,
  sessionTypeItem,
} from "../../constants";
// import { Traits, Trait } from "../../types";
import CowboyBebopActor from "../documents/cowboybebopActor";
import { RULESET } from "../../slicedDials";
import { cartonHolders, cartonTotals } from "../../economy";
import {
  dialsOfPrime,
  getActivePrime,
  isActivePrime,
  linkDialToPrime,
  posterOptions,
  unlinkDial,
  unlinkedDials,
} from "../../prime";
import {
  availableSessionTypes,
  hasAnyRiff,
  riffCards,
  riffEditor,
  sessionTypeUpdate,
  wireRiffEditor,
} from "../../riffs";

const escapeHtml = (value: unknown): string =>
  (foundry as any).utils.escapeHTML(String(value ?? ""));

export default class CowboyBebopItemSheet extends ActorSheet {
  // Define the template to use for this sheet
  override get template() {
    return `systems/${moduleId}/templates/sheets/actor/actor-sheet-${this.actor.type}.hbs`;
  }

  // Data to be passed to the template when rendering
  override async getData() {
    let data: any = super.getData();
    data.isGM = (game as Game).user?.isGM;
    data.genres = genres;
    data.mouvements = mouvements;
    // The one table of genre icons and colours, handed to the sheet rather
    // than restated in the template: dice, tokens and slices already draw a
    // genre from here, and a second list would drift from the first.
    data.genreColors = colors;

    if (this.actor.type === "chasseur") {
      // Older hunters may predate the cartons field. Always expose the full
      // genre breakdown so the GM's correction buttons remain available.
      data.cartons = Object.fromEntries(
        genres.map((genre) => [
          genre,
          Number((this.actor as any).system?.cartons?.[genre] ?? 0),
        ])
      );

      // Les riffs d'un chasseur sont ceux de la session, pas les siens : c'est
      // la prime en jeu qui les décide, donc une table entre deux primes n'a
      // rien à montrer. Et seulement ceux de son bord - les options de Big Shot
      // se lisent sur la fiche de la prime.
      const prime = getActivePrime();
      data.riffPrimeName = prime?.name ?? "";
      if (prime) {
        const mouvement = Number(prime.system?.mouvement ?? 0);
        data.riffs = riffCards(prime, mouvement, "hunter");
        data.riffMouvementName = mouvements[mouvement]?.name ?? "";
        data.sessionType = prime.system?.sessionType ?? "";
      }
    }

    if (this.actor.type === "prime") {
      data.isActivePrime = isActivePrime(this.actor);
      data.linkedDialCount = dialsOfPrime(this.actor).length;
      // Old primes predate their optional bonus-carton reserve.
      data.primeCartons = Object.fromEntries(
        genres.map((genre) => [
          genre,
          Number((this.actor as any).system?.cartons?.[genre] ?? 0),
        ])
      );
      data.cartonHolders = cartonHolders(data.isGM);
      data.cartonTotals = cartonTotals();

      // What the session block shows is a permission question, so it is
      // answered here once rather than by an isGM test on every line of the
      // template. A player sees the traits the GM has turned over and nothing
      // else; the GM sees all three plus the state of each.
      const actor = this.actor as CowboyBebopActor;
      const traits = actor.sessionTraits();
      const secret = actor.secret();

      data.sessionTraits = traits.map((trait, index) => ({ ...trait, index }));
      data.visibleSessionTraits = data.sessionTraits.filter(
        (trait: any) => data.isGM || (trait.revealed && trait.name !== "")
      );
      data.secret = secret;
      data.secretVisible = data.isGM || secret.revealed;
      // With nothing revealed and nothing to write, the block is noise on a
      // player's screen - so it is simply not drawn there.
      data.showSession =
        data.isGM ||
        data.visibleSessionTraits.length > 0 ||
        (secret.revealed && secret.text !== "");
      // Read through the same defaults the poster uses, so a prime created
      // before the poster existed shows checkboxes that match what it displays.
      data.poster = posterOptions(this.actor);

      // Big Shot règle la table entière ; les autres lisent le mouvement joué,
      // la même aide qu'un chasseur porte sur sa propre fiche - et seulement
      // les riffs de leur bord.
      const mouvement = Number((this.actor as any).system?.mouvement ?? 0);
      data.riffs = riffCards(this.actor, mouvement, "hunter");
      data.riffMouvementName = mouvements[mouvement]?.name ?? "";
      data.sessionType = (this.actor as any).system?.sessionType ?? "";
      // Le compte annoncé est celui du mouvement en cours, tous publics
      // confondus : c'est ce que la section montre une fois dépliée.
      data.riffCount =
        data.riffs.length + riffCards(this.actor, mouvement, "bigshot").length;
      if (data.isGM) data.riffEditor = riffEditor(this.actor, mouvement);
    }

    return data;
  }

  // Event Listeners
  override activateListeners(html: JQuery) {
    super.activateListeners(html);
    // Roll handlers, click handlers, etc. would go here.
    html.find(".cowboy-actor-roll").on("click", this._onRollDice.bind(this));

    // Rendering and using a dial depends on the dial's own permission, not on
    // whether this actor sheet is editable. A player may observe the prime but
    // own one of its dials, and must be able to spend their cartons there.
    if (this.actor.type === "prime") this._mountDials(html);

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

  /**
   * Deux zones de dépôt sur une fiche de prime : les cadrans associés adoptent
   * un cadran du monde, la section des riffs applique un type de session. Un
   * dépôt ailleurs garde le comportement normal de Foundry.
   */
  protected override async _onDrop(event: DragEvent): Promise<any> {
    const target = event.target as HTMLElement | null;
    const zone = target?.closest?.(".cowboy-prime-dials");
    const riffZone = target?.closest?.(".cowboy-prime-riffs");

    if (this.actor.type === "prime" && riffZone && !zone) {
      event.preventDefault();
      event.stopPropagation();
      riffZone.classList.remove("cowboy-dial-drop-active");

      if (!(game as any).user?.isGM || !this.actor.isOwner) return false;

      const editor = (foundry as any).applications?.ux?.TextEditor
        ?.implementation;
      const data = editor?.getDragEventData(event);
      // Un type de session vient souvent du compendium, où il n'existe que par
      // son uuid : rien n'est importé dans le monde, on ne copie que ce qu'il
      // porte.
      if (data?.type !== "Item" || !data?.uuid) {
        ui.notifications?.warn(
          (game as any).i18n.localize("COWBOY.sessionType.dropTypeOnly")
        );
        return false;
      }

      return this._applySessionType(data.uuid);
    }

    if (this.actor.type !== "prime" || !zone) {
      return super._onDrop(event);
    }

    event.preventDefault();
    event.stopPropagation();
    zone.classList.remove("cowboy-dial-drop-active");

    if (!(game as any).user?.isGM || !this.actor.isOwner) return false;

    const editor = (foundry as any).applications?.ux?.TextEditor
      ?.implementation;
    const data = editor?.getDragEventData(event);
    if (data?.type !== "Item") {
      ui.notifications?.warn(
        (game as any).i18n.localize("COWBOY.dials.dropDialOnly")
      );
      return false;
    }

    const dial = await (Item as any).fromDropData(data);
    if (dial?.type !== "sliced-dials.dial") {
      ui.notifications?.warn(
        (game as any).i18n.localize("COWBOY.dials.dropDialOnly")
      );
      return false;
    }

    // Linked dials are deliberately world Items. A compendium or embedded
    // Item would accept a flag but dialsOfPrime could never find it again.
    const worldDial = (game as any).items?.get(dial.id);
    if (!worldDial || worldDial !== dial) {
      ui.notifications?.warn(
        (game as any).i18n.localize("COWBOY.dials.dropWorldDialOnly")
      );
      return false;
    }

    await linkDialToPrime(worldDial, this.actor);
    ui.notifications?.info(
      (game as any).i18n.format("COWBOY.dials.dropLinked", {
        name: worldDial.name,
      })
    );
    this.render(false);
    return worldDial;
  }

  private activateListenersPC(html: JQuery) {
    html
      .find(".cowboy-admin-action-health")
      .on("click", this._onDamage.bind(this));

    html
      .find(".cowboy-actor-trait-name")
      .on("change", this._onRenameTrait.bind(this));

    // The button shown on a damaged trait. It replaced a checkbox some time
    // ago, and the listener kept pointing at the checkbox's class - which no
    // template carries any more, so nothing was ever wired and the button did
    // nothing at all.
    html
      .find(".cowboy-actor-trait-heal")
      .on("click", this._onHealTrait.bind(this));

    html
      .find(".cowboy-admin-action-restore")
      .on("click", this._onRestore.bind(this));

    html
      .find(".cowboy-rythme-add")
      .on("click", this._onAddRythme.bind(this));

    // Hunters hold their own cartons; notes live on the active prime.
    html
      .find(".cowboy-prime-tokens-add")
      .on("click", this._onAddToken.bind(this));
  }

  private activateListenersNPC(html: JQuery) {
    html.find(".cowboy-dials-add").on("click", this._onAddDial.bind(this));
    html.find(".cowboy-dials-link").on("click", this._onLinkDial.bind(this));
    html
      .find(".cowboy-dials-unlink")
      .on("click", this._onUnlinkDial.bind(this));
    html
      .find(".cowboy-prime-current-target-button")
      .on("click", this._onSetCurrent.bind(this));
    html
      .find(".cowboy-prime-clear-target-button")
      .on("click", this._onClearCurrent.bind(this));
    html
      .find(".cowboy-prime-genre")
      .on("change", this._onSelectGenre.bind(this));
    html
      .find(".cowboy-prime-mouvement")
      .on("change", this._onSelectMouvement.bind(this));
    html
      .find(".cowboy-prime-tokens-add")
      .on("click", this._onAddToken.bind(this));

    html
      .find(".cowboy-session-trait-name")
      .on("change", this._onRenameSessionTrait.bind(this));

    // Only the GM is given these, and only the GM's click on them means
    // anything: the reveal is what decides whether a player sees the line.
    html
      .find(".cowboy-session-reveal")
      .on("click", this._onToggleReveal.bind(this));

    // L'éditeur de riffs n'est dessiné que pour Big Shot, donc les écoutes
    // n'ont rien à trouver chez les autres - le même câblage que sur la fiche
    // d'un type de session, sur un porteur différent.
    wireRiffEditor(html, this.actor);
    html
      .find(".cowboy-riff-apply-button")
      .on("click", this._onApplySessionType.bind(this));
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

  // Handle rhythm
  private async _onAddRythme(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const points = parseInt(
      (event.currentTarget as HTMLElement).dataset.value ?? "0"
    );
    await (this.actor as CowboyBebopActor).updateRythme(points);
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
  /**
   * Puts a damaged trait back in play. Only ever offered on a trait that is
   * damaged and not broken: a broken one is not something this button can
   * undo, and the template does not draw it there.
   */
  private async _onHealTrait(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget as HTMLElement;
    const traitId = parseInt(element.dataset.index ?? "0");
    const traitCategoryId = element.dataset.category;

    if (traitCategoryId === undefined) return;

    await (this.actor as CowboyBebopActor).damageTrait(
      traitCategoryId,
      traitId,
      false,
      false
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
   *
   * What it does decide is *which* dials: the ones flagged for this prime. They
   * are world documents rather than items embedded here, so that a player can
   * be made owner of a single objective dial without being handed the prime.
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

    const linked = dialsOfPrime(this.actor);
    const isGM = (game as any).user?.isGM === true;

    // `mountDials` also subscribes to dial changes and redraws itself, which is
    // why the empty state goes through `onRender` rather than being written
    // once after mounting: a redraw would put the list back over it.
    api.mountDials(container, linked, {
      // A prime sheet is also where the GM prepares its dials, so they are
      // shown here in every state - including prepared ones, correctly absent
      // from every play surface.
      states: isGM ? "all" : "play",
      controls: isGM,
      onRender: (root: HTMLElement) => {
        if (root.querySelector(".sd-hud-dial")) return;

        root.innerHTML = `<p class="cowboy-prime-empty">${escapeHtml(
          (game as any).i18n.localize("COWBOY.dials.noneVisible")
        )}</p>`;
      },
    });

    if (isGM && this.options.editable) {
      container.title = (game as any).i18n.localize(
        "COWBOY.dials.dropHint"
      );

      const enter = (event: DragEvent) => {
        event.preventDefault();
        container.classList.add("cowboy-dial-drop-active");
      };

      container.addEventListener("dragenter", enter);
      container.addEventListener("dragover", enter);
      container.addEventListener("dragleave", (event: DragEvent) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !container.contains(next)) {
          container.classList.remove("cowboy-dial-drop-active");
        }
      });
      container.addEventListener("drop", () =>
        container.classList.remove("cowboy-dial-drop-active")
      );
    }
  }

  /**
   * Creates a dial for this prime. Objectives and threats both accept cartons
   * or false notes; the payer picker decides which resource funds each slice.
   */
  private async _onAddDial(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const size = parseInt(button.dataset.size ?? "4");
    const objective = button.dataset.goal === "true";

    const created = await Item.create({
      name: objective
        ? (game as any).i18n.localize("COWBOY.actor.goal")
        : (game as any).i18n.localize("COWBOY.actor.threat"),
      type: "sliced-dials.dial",
      system: {
        size,
        ruleset: RULESET,
        // What it is, and separately what it takes. A menace still accepts a
        // hunter's cartons - spending one on it is how you push it back - so
        // the tone is not a constraint on the signs.
        tone: objective ? "positive" : "negative",
        allowedSigns: ["+", "-"],
      },
      flags: { [moduleId]: { [primeFlag]: this.actor.id } },
    } as any);

    this.render(false);
    (created as any)?.sheet?.render(true);
  }

  /**
   * Adopts a dial that already exists - one built in a compendium, or left over
   * from a prime that got away.
   */
  private async _onLinkDial(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const free = unlinkedDials();
    if (free.length === 0) {
      ui.notifications?.info(
        (game as any).i18n.localize("COWBOY.dials.noneFree")
      );
      return;
    }

    const options = free
      .map(
        (dial: any) =>
          `<option value="${escapeHtml(dial.id)}">${escapeHtml(dial.name)}</option>`
      )
      .join("");

    const { DialogV2 } = (foundry as any).applications.api;

    const dialId = await DialogV2.prompt({
      window: { title: (game as any).i18n.localize("COWBOY.dials.link") },
      content: `<select name="dial" style="width:100%">${options}</select>`,
      ok: {
        label: (game as any).i18n.localize("COWBOY.dials.link"),
        callback: (_event: Event, button: any) =>
          button.form.elements.dial.value,
      },
    });

    if (!dialId) return;

    const dial = (game as any).items?.get(dialId);
    if (!dial) return;

    await linkDialToPrime(dial, this.actor);
    this.render(false);
  }

  private async _onUnlinkDial(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const linked = dialsOfPrime(this.actor);
    if (linked.length === 0) {
      ui.notifications?.info(
        (game as any).i18n.localize("COWBOY.dials.noneLinked")
      );
      return;
    }

    const options = linked
      .map(
        (dial: any) =>
          `<option value="${escapeHtml(dial.id)}">${escapeHtml(dial.name)}</option>`
      )
      .join("");

    const { DialogV2 } = (foundry as any).applications.api;
    const dialId = await DialogV2.prompt({
      window: { title: (game as any).i18n.localize("COWBOY.dials.unlink") },
      content: `<select name="dial" style="width:100%">${options}</select>`,
      ok: {
        label: (game as any).i18n.localize("COWBOY.dials.unlink"),
        callback: (_event: Event, button: any) =>
          button.form.elements.dial.value,
      },
    });

    if (!dialId) return;

    const dial = (game as any).items?.get(dialId);
    if (!dial) return;

    await unlinkDial(dial);
    this.render(false);
  }

  /**
   * Applique un type de session à cette prime : ses trois listes sont copiées,
   * son nom retenu, et le lien oublié aussitôt (ADR 0003).
   *
   * La copie écrase, riffs libres compris, donc une prime déjà garnie demande
   * confirmation. Une prime vierge n'a rien à perdre et ne demande rien.
   */
  private async _onApplySessionType(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const types = await availableSessionTypes();
    if (types.length === 0) {
      ui.notifications?.info(
        (game as any).i18n.localize("COWBOY.sessionType.noneAvailable")
      );
      return;
    }

    const options = types
      .map(
        (type) =>
          `<option value="${escapeHtml(type.id)}">${escapeHtml(
            type.name
          )} — ${escapeHtml(type.source)}</option>`
      )
      .join("");

    const { DialogV2 } = (foundry as any).applications.api;
    const uuid = await DialogV2.prompt({
      window: {
        title: (game as any).i18n.localize("COWBOY.sessionType.apply"),
      },
      content: `<select name="sessionType" style="width:100%">${options}</select>`,
      ok: {
        label: (game as any).i18n.localize("COWBOY.sessionType.apply"),
        callback: (_event: Event, button: any) =>
          button.form.elements.sessionType.value,
      },
    });

    if (!uuid) return;
    await this._applySessionType(uuid);
  }

  /** Le cœur partagé par le sélecteur et le glisser-déposer. */
  private async _applySessionType(uuid: string): Promise<boolean> {
    const sessionType = await (foundry as any).utils.fromUuid(uuid);
    if (sessionType?.type !== sessionTypeItem) {
      ui.notifications?.warn(
        (game as any).i18n.localize("COWBOY.sessionType.dropTypeOnly")
      );
      return false;
    }

    if (hasAnyRiff(this.actor)) {
      const { DialogV2 } = (foundry as any).applications.api;
      const confirmed = await DialogV2.confirm({
        window: {
          title: (game as any).i18n.localize("COWBOY.sessionType.apply"),
        },
        content: `<p>${escapeHtml(
          (game as any).i18n.format("COWBOY.sessionType.overwrite", {
            name: sessionType.name,
          })
        )}</p>`,
      });
      if (!confirmed) return false;
    }

    await this.actor.update(sessionTypeUpdate(sessionType));
    ui.notifications?.info(
      (game as any).i18n.format("COWBOY.sessionType.applied", {
        name: sessionType.name,
      })
    );

    // La mise en place n'est pas une mécanique, c'est une consigne : elle est
    // montrée au moment où elle sert plutôt que rangée dans un onglet.
    const setup = String(sessionType.system?.setup ?? "").trim();
    if (setup) {
      const { DialogV2 } = (foundry as any).applications.api;
      void DialogV2.prompt({
        window: { title: sessionType.name },
        content: `<p>${escapeHtml(setup).replace(/\n/g, "<br/>")}</p>`,
        ok: { label: (game as any).i18n.localize("COWBOY.dials.close") },
      });
    }

    return true;
  }

  private _onSetCurrent(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    (this.actor as CowboyBebopActor).setActive();
  }

  private _onClearCurrent(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    (this.actor as CowboyBebopActor).setInactive();
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

  private async _onRenameSessionTrait(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const input = event.currentTarget as HTMLInputElement;
    const index = parseInt(input.dataset.index ?? "-1");

    await (this.actor as CowboyBebopActor).renameSessionTrait(
      index,
      input.value
    );
  }

  /**
   * Turns a session trait, or the secret, over to the table - and back again if
   * it was shown too early.
   */
  private async _onToggleReveal(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const revealed = button.dataset.revealed !== "true";
    const actor = this.actor as CowboyBebopActor;

    if (button.dataset.target === "secret") {
      await actor.revealSecret(revealed);
    } else {
      await actor.revealSessionTrait(
        parseInt(button.dataset.index ?? "-1"),
        revealed
      );
    }

    this.render(false);
  }

  private async _onAddToken(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const value = parseInt(
      button.dataset.value ?? "0"
    );

    // The hunter rows on a prime sheet name their own actor, so the GM can
    // correct a player's cartons without opening their sheet. Everything else
    // is a pool this actor holds itself.
    const targetId = button.dataset.actorId;
    const target = targetId
      ? (game as any).actors?.get(targetId)
      : this.actor;

    if (!target) return;

    await (target as CowboyBebopActor).addToken(
      button.dataset.genre ?? "",
      button.dataset.type ?? "",
      value
    );
    // No render here: crediting a hunter leaves this prime's own data untouched,
    // so the refresh of every open prime sheet is adjust()'s job.
  }
}
