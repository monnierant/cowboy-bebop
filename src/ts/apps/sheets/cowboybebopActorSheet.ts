import {
  moduleId,
  genres,
  grooveItem,
  monoActor,
  mouvements,
  primeFlag,
  colors,
  sessionTypeItem,
  vaisseauMereActor,
  vaisseauMereDescriptors,
} from "../../constants";
import {
  dropGroove,
  grooveCard,
  groovePlayOffer,
  activationCards,
  playGroove,
  removeGroove,
  grooveIdOf,
} from "../../grooves";
import { BESPOKE_GROOVES } from "../../rolls/bespokeGrooves";
import {
  damageMonoTrait,
  monoOf,
  monoSheetData,
  renameMonoTrait,
  restoreMono,
} from "../../mono";
// import { Traits, Trait } from "../../types";
import CowboyBebopActor from "../documents/cowboybebopActor";
import { RULESET } from "../../slicedDials";
import { cartonHolders, cartonTotals, resetSession } from "../../economy";
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

/**
 * La taille à **l'ouverture**, par type d'acteur. Rien de plus : la fenêtre
 * reste redimensionnable, et Foundry retient ensuite ce que l'utilisateur en a
 * fait. Absent de cette table, un type garde la taille par défaut de Foundry.
 *
 * Un MONO est une carte grise : un portrait, un nom, trois lignes. Un vaisseau
 * mère en demande un peu plus, ses descripteurs portant chacun trois champs.
 */
const SHEET_SIZES: Record<string, { width: number; height: number }> = {
  mono: { width: 500, height: 300 },
  vaisseauMere: { width: 460, height: 520 },
};

export default class CowboyBebopItemSheet extends ActorSheet {
  // Define the template to use for this sheet
  override get template() {
    return `systems/${moduleId}/templates/sheets/actor/actor-sheet-${this.actor.type}.hbs`;
  }

  /**
   * Les onglets d'une fiche de prime. Déclarés pour toutes les fiches sans
   * dommage : sans barre d'onglets dans le gabarit, Foundry ne trouve rien à
   * relier et n'en fait rien.
   */
  static override get defaultOptions() {
    return (foundry as any).utils.mergeObject(super.defaultOptions, {
      tabs: [
        {
          navSelector: ".cowboy-sheet-tabs",
          contentSelector: ".cowboy-sheet-body",
          initial: "main",
        },
      ],
    });
  }

  /**
   * La taille d'ouverture, par type d'acteur.
   *
   * `defaultOptions` est statique et ne sait pas quel acteur elle habille, donc
   * l'ajustement se fait ici, où l'acteur existe. Un MONO tient en trois lignes
   * et un portrait : lui donner la fenêtre d'un chasseur laisserait les deux
   * tiers vides.
   */
  constructor(document?: any, options: any = {}) {
    // La taille doit entrer dans les options *avant* `super`, pas après :
    // `Application` fige `this.position` à partir d'elles pendant sa propre
    // construction. Écrite ensuite, elle n'aurait plus rien à dimensionner - et
    // la fiche s'ouvrait donc toujours au format par défaut.
    //
    // Le type se lit sur le document reçu plutôt que sur `this.actor`, qui
    // n'existe pas encore à cet instant.
    const size = SHEET_SIZES[document?.type ?? ""];

    // `resizable` est réaffirmé plutôt que supposé : ces deux nombres disent
    // par quoi la fenêtre commence, pas ce à quoi elle est contrainte.
    super(document, size ? { ...options, ...size, resizable: true } : options);
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

    // Les trois hexagones du MONO se dessinent sur sa propre fiche et sur
    // celle de son pilote, avec les mêmes commandes : le livre les met sur la
    // fiche de personnage, et personne n'ouvre une seconde fenêtre en pleine
    // poursuite.
    if (this.actor.type === monoActor) {
      Object.assign(data, monoSheetData(this.actor));
    }

    if (this.actor.type === vaisseauMereActor) {
      data.descriptors = this.descriptorRows();
    }

    if (this.actor.type === "chasseur" || this.actor.type === "prime") {
      Object.assign(data, monoSheetData(monoOf(this.actor)));

      // Le groove : une capacité nommée, portée par un item possédé. Sur la
      // fiche il n'est qu'une identité - c'est la boîte de jet et la carte qui
      // le rappellent au moment où il peut se déclencher (ADR 0010).
      data.groove = grooveCard(this.actor);
    }

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
        data.running = activationCards(prime);
      }

      // Solo ! est le seul riff qui a son bouton sur la fiche. Ce qui le barre
      // est calculé ici plutôt que dans le gabarit, parce qu'il y a deux
      // raisons distinctes - déjà joué, ou réserve vide - et qu'un bouton grisé
      // sans motif se lit comme une panne.
      const actor = this.actor as CowboyBebopActor;
      const solo = actor.soloOffer();
      if (solo) {
        const used = actor.soloPlayed();
        const cannotPay = solo.stuck ? solo.choices[0]?.blocked : undefined;

        data.solo = {
          name: solo.name,
          blocked: used || solo.stuck,
          tooltip: used
            ? (game as any).i18n.localize("COWBOY.riffs.soloUsed")
            : cannotPay ?? solo.description,
        };
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
      const bigshotRiffs = riffCards(this.actor, mouvement, "bigshot");
      data.riffCount = data.riffs.length + bigshotRiffs.length;
      // Ce que la pastille dit au survol. Big Shot voit ses propres options en
      // plus ; un joueur n'y lit que ce que sa fiche lui montre déjà.
      data.riffTooltip = this.riffTooltip(
        data.riffs,
        data.isGM ? bigshotRiffs : []
      );
      // La réserve de Big Shot. Les primes créées avant qu'elle existe n'ont
      // pas le champ, et une réserve absente vaut zéro.
      data.risque = Number((this.actor as any).system?.risque ?? 0);
      data.running = activationCards(this.actor);
      if (data.isGM) data.groovePlay = groovePlayOffer(this.actor);
      if (data.isGM) {
        const grooveId = grooveIdOf(this.actor);
        const state = (this.actor as any).system?.grooveState ?? {};
        const hunters = ((game as any).actors ?? [])
          .filter((candidate: any) => candidate.type === "chasseur")
          .map((candidate: any) => ({
            id: candidate.id,
            name: candidate.name,
            cartridge: Number(candidate.system?.cartridge ?? 0),
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        const minimum = hunters.length
          ? Math.min(...hunters.map((hunter: any) => hunter.cartridge))
          : 0;
        const chosen = Array.isArray(state.shadowsHunterIds)
          ? state.shadowsHunterIds.map(String).slice(0, 2)
          : [];

        data.bespokeGroove = {
          editable: data.isActivePrime,
          orbital: grooveId === BESPOKE_GROOVES.orbital,
          orbitalSafe: state.orbitalSafe === true,
          vengeance: grooveId === BESPOKE_GROOVES.vengeance,
          vengeanceHunters: hunters.map((hunter: any) => ({
            ...hunter,
            selected: hunter.id === String(state.vengeanceHunterId ?? ""),
            minimum: hunter.cartridge === minimum,
          })),
          shadows: grooveId === BESPOKE_GROOVES.shadows,
          shadowsAccepted: state.shadowsAccepted === true,
          shadowsShowAcceptance: secret.revealed || state.shadowsAccepted === true,
          shadowsCanToggle: data.isActivePrime && (secret.revealed || state.shadowsAccepted === true),
          shadowsSlots: [0, 1].map((index) => ({
            index,
            options: hunters
              .filter((hunter: any) => hunter.id === chosen[index] || !chosen.includes(hunter.id))
              .map((hunter: any) => ({ ...hunter, selected: hunter.id === chosen[index] })),
          })),
        };
      }
      if (data.isGM) data.riffEditor = riffEditor(this.actor, mouvement);
    }

    return data;
  }

  /**
   * Ce que la pastille des riffs dit au survol : les riffs réellement ouverts
   * au mouvement en cours, un par ligne, groupés par public.
   *
   * Rendu en HTML et servi par l'infobulle de Foundry plutôt que par l'attribut
   * `title` du navigateur : celui-ci ne sait afficher que du texte brut, ce qui
   * tassait dix riffs sur deux lignes illisibles.
   *
   * Aucune balise ne porte d'attribut, pour que la chaîne tienne dans une
   * valeur d'attribut sans guillemet à échapper. Les noms, eux, sont échappés :
   * un riff libre est écrit par Big Shot, donc c'est du texte quelconque.
   */
  private riffTooltip(hunterRiffs: any[], bigshotRiffs: any[]): string {
    const i18n = (game as any).i18n;
    const blocks: string[] = [];

    const section = (title: string, cards: any[]) => {
      if (cards.length === 0) return;
      const items = cards
        .map((card) => `<li>${escapeHtml(card.name)}</li>`)
        .join("");
      blocks.push(`<strong>${escapeHtml(title)}</strong><ul>${items}</ul>`);
    };

    section(i18n.localize("COWBOY.riffs.hunters"), hunterRiffs);
    section(i18n.localize("COWBOY.riffs.bigshot"), bigshotRiffs);

    if (blocks.length === 0) {
      return `<em>${escapeHtml(i18n.localize("COWBOY.riffs.none"))}</em>`;
    }

    return blocks.join("");
  }

  /**
   * Les trois colonnes du tableau des vaisseaux mères, dans l'ordre du livre.
   *
   * Elles ne sont pas interchangeables - les deux premières portent un thème,
   * la troisième un ton - donc chaque ligne va chercher ses propres libellés
   * plutôt que de partager un gabarit qui mentirait sur la dernière.
   */
  private descriptorRows() {
    const i18n = (game as any).i18n;
    const stored = (this.actor as any).system?.descriptors ?? [];

    return vaisseauMereDescriptors.map((role, index) => ({
      index,
      name: String(stored[index]?.name ?? ""),
      genre: String(stored[index]?.genre ?? ""),
      meaning: String(stored[index]?.meaning ?? ""),
      roleLabel: i18n.localize(`COWBOY.vaisseauMere.roles.${role}`),
      placeholder: i18n.localize(`COWBOY.vaisseauMere.placeholders.${role}`),
      meaningPlaceholder: i18n.localize(
        `COWBOY.vaisseauMere.meanings.${role}`
      ),
    }));
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
        this.activateListenersMono(html);
        break;
      case "prime":
        this.activateListenersNPC(html);
        this.activateListenersMono(html);
        break;
      case monoActor:
        this.activateListenersMono(html);
        break;
    }
  }

  /**
   * Les commandes du MONO, identiques sur les trois fiches qui le montrent.
   *
   * Elles écrivent toujours sur l'appareil lui-même, jamais sur la fiche
   * ouverte : c'est l'attribut porté par chaque bouton qui dit lequel, ce qui
   * évite de se demander ici sur quel type de fiche on se trouve.
   */
  private activateListenersMono(html: JQuery) {
    html
      .find(".cowboy-mono-trait-name")
      .on("change", this._onRenameMonoTrait.bind(this));
    html
      .find(".cowboy-mono-trait-heal")
      .on("click", this._onHealMonoTrait.bind(this));
    html
      .find(".cowboy-mono-trait-cycle")
      .on("click", this._onCycleMonoTrait.bind(this));
    html.find(".cowboy-mono-open").on("click", this._onOpenMono.bind(this));
    html.find(".cowboy-mono-unlink").on("click", this._onUnlinkMono.bind(this));

    html.find(".cowboy-groove-open").on("click", (event: Event) => {
      event.preventDefault();
      this.actor.items
        ?.find((item: any) => item.type === grooveItem)
        ?.sheet?.render(true);
    });
    html.find(".cowboy-groove-remove").on("click", (event: Event) => {
      event.preventDefault();
      void removeGroove(this.actor).then(() => this.render(false));
    });
    html
      .find(".cowboy-mono-restore")
      .on("click", this._onRestoreMono.bind(this));

    this._wireMonoDropZone(html);
  }

  /**
   * Fait réagir la vignette du header pendant un glisser-déposer.
   *
   * Le dépôt lui-même est accepté n'importe où sur la fiche - il n'y a qu'un
   * MONO par chasseur, donc aucune ambiguïté sur la cible. Cette zone-ci ne
   * fait que dire où viser.
   */
  private _wireMonoDropZone(html: JQuery) {
    const slot = html.find(".cowboy-mono-slot").get(0);
    if (!slot) return;

    const enter = (event: DragEvent) => {
      event.preventDefault();
      slot.classList.add("cowboy-dial-drop-active");
    };
    const leave = () => slot.classList.remove("cowboy-dial-drop-active");

    slot.addEventListener("dragenter", enter);
    slot.addEventListener("dragover", enter);
    slot.addEventListener("dragleave", (event: DragEvent) => {
      const next = event.relatedTarget as Node | null;
      if (!next || !slot.contains(next)) leave();
    });
    slot.addEventListener("drop", leave);
  }

  // ========================================
  // MONO Actions
  // ========================================

  /** Le MONO que ce bouton désigne, ou l'appareil dont c'est la fiche. */
  private monoFrom(element: HTMLElement): any {
    const uuid = element.dataset.monoUuid;
    if (uuid) return (foundry as any).utils?.fromUuidSync?.(uuid);
    return this.actor.type === monoActor ? this.actor : monoOf(this.actor);
  }

  private async _onRenameMonoTrait(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const input = event.currentTarget as HTMLInputElement;
    await renameMonoTrait(
      this.monoFrom(input),
      Number.parseInt(input.dataset.index ?? "0"),
      input.value
    );
  }

  private async _onHealMonoTrait(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    await damageMonoTrait(
      this.monoFrom(button),
      Number.parseInt(button.dataset.index ?? "0"),
      false,
      false
    );
    this.render(false);
  }

  private _onOpenMono(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    monoOf(this.actor)?.sheet?.render(true);
  }

  private async _onUnlinkMono(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Le lien seul est rompu : l'appareil reste un acteur du monde, qu'on peut
    // redonner à quelqu'un d'autre ou poser sur une scène sans pilote.
    await this.actor.update({ "system.mono": "" });
    this.render(false);
  }

  /**
   * La remise à neuf de l'appareil, séparée de celle de son pilote : Big Shot
   * peut réparer le vaisseau sans effacer les cicatrices du chasseur.
   */
  private async _onRestoreMono(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    await restoreMono(this.monoFrom(event.currentTarget as HTMLElement));
    this.render(false);
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

    // Un MONO déposé n'importe où sur une fiche de chasseur ou de prime devient
    // son appareil. Pas de zone dédiée : le livre en donne un seul par
    // personnage, donc il n'y a jamais d'ambiguïté sur ce qu'on vise.
    const linked = await this._onDropMono(event);
    if (linked !== null) return linked;

    // Un groove suit la même règle et pour la même raison : un chasseur en porte
    // un, une prime en porte un, et il n'y a rien à viser.
    const groove = await this._onDropGroove(event);
    if (groove !== null) return groove;

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

  /**
   * Adopte un groove déposé sur la fiche. Rend `null` quand le dépôt n'était pas
   * un groove, pour que le reste du glisser-déposer suive son cours.
   *
   * Le groove vient le plus souvent du compendium, où il n'existe que par son
   * uuid : `fromDropData` le matérialise, et `dropGroove` en pose une copie
   * possédée. Rien ne reste relié à l'original (ADR 0010).
   */
  private async _onDropGroove(event: DragEvent): Promise<any> {
    if (this.actor.type !== "chasseur" && this.actor.type !== "prime") {
      return null;
    }

    const editor = (foundry as any).applications?.ux?.TextEditor?.implementation;
    const data = editor?.getDragEventData(event);
    if (data?.type !== "Item" || !data?.uuid) return null;

    const item = await (Item as any).fromDropData(data);
    if (item?.type !== grooveItem) return null;

    event.preventDefault();
    event.stopPropagation();

    if (!this.actor.isOwner) return false;

    const dropped = await dropGroove(this.actor, item);
    if (dropped) this.render(false);

    return dropped;
  }

  /**
   * Adopte un MONO déposé sur la fiche. Rend `null` quand le dépôt n'était pas
   * un MONO, pour que le reste du glisser-déposer suive son cours.
   */
  private async _onDropMono(event: DragEvent): Promise<any> {
    if (this.actor.type !== "chasseur" && this.actor.type !== "prime") {
      return null;
    }

    const editor = (foundry as any).applications?.ux?.TextEditor?.implementation;
    const data = editor?.getDragEventData(event);
    if (data?.type !== "Actor" || !data?.uuid) return null;

    const mono = await (Actor as any).fromDropData(data);
    if (mono?.type !== monoActor) return null;

    event.preventDefault();
    event.stopPropagation();

    if (!this.actor.isOwner) return false;

    // Le lien est un uuid et non l'appareil lui-même : un MONO se pose sur une
    // scène, donc il doit rester un acteur du monde plutôt que devenir la
    // propriété d'une fiche.
    await this.actor.update({ "system.mono": mono.uuid });
    ui.notifications?.info(
      (game as any).i18n.format("COWBOY.mono.linked", { name: mono.name })
    );
    this.render(false);
    return mono;
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
      .find(".cowboy-actor-trait-cycle")
      .on("click", this._onCycleTrait.bind(this));

    html
      .find(".cowboy-admin-action-restore")
      .on("click", this._onRestore.bind(this));

    html
      .find(".cowboy-rythme-add")
      .on("click", this._onAddRythme.bind(this));

    html.find(".cowboy-solo-play").on("click", (event: Event) => {
      event.preventDefault();
      void (this.actor as CowboyBebopActor).playSolo();
    });

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
      .find(".cowboy-prime-risque-add")
      .on("click", this._onAddRisque.bind(this));
    html.find(".cowboy-groove-play").on("click", (event: Event) => {
      event.preventDefault();
      const choice = Number.parseInt(
        (event.currentTarget as HTMLElement).dataset.choice ?? "0"
      );
      void playGroove(this.actor, choice);
    });
    html.find(".cowboy-groove-state-toggle").on("click", async (event: Event) => {
      event.preventDefault();
      if (!(game as any).user?.isGM || !isActivePrime(this.actor)) return;
      const button = event.currentTarget as HTMLElement;
      const field = button.dataset.field;
      if (field !== "orbitalSafe" && field !== "shadowsAccepted") return;
      const current = (this.actor as any).system?.grooveState?.[field] === true;
      if (field === "shadowsAccepted" && !current && (this.actor as any).system?.secret?.revealed !== true) return;
      await this.actor.update({ [`system.grooveState.${field}`]: !current });
    });
    html.find(".cowboy-groove-hunter-select").on("change", async (event: Event) => {
      if (!(game as any).user?.isGM || !isActivePrime(this.actor)) return;
      const select = event.currentTarget as HTMLSelectElement;
      if (select.dataset.kind === "vengeance") {
        await this.actor.update({ "system.grooveState.vengeanceHunterId": select.value });
        return;
      }
      const index = Number.parseInt(select.dataset.index ?? "-1");
      if (index < 0 || index > 1) return;
      const chosen = Array.isArray((this.actor as any).system?.grooveState?.shadowsHunterIds)
        ? [...(this.actor as any).system.grooveState.shadowsHunterIds].map(String).slice(0, 2)
        : [];
      chosen[index] = select.value;
      const clean = chosen.filter((id, position) => id && chosen.indexOf(id) === position);
      await this.actor.update({ "system.grooveState.shadowsHunterIds": clean });
    });
    html
      .find(".cowboy-prime-reset")
      .on("click", this._onResetSession.bind(this));

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

  /**
   * L'état suivant d'un trait, dans l'ordre où Big Shot le fait tourner :
   * intact, entamé, brisé, et retour à intact.
   *
   * C'est la seule façon de défaire un clic de trop sur une carte de chat -
   * entamer et briser y sont irréversibles, et la remise à neuf est trop
   * grossière pour rattraper une fausse manipulation sur un seul trait.
   */
  private static nextTraitState(element: HTMLElement) {
    const dented = element.dataset.dented === "true";
    const broken = element.dataset.broken === "true";

    if (broken) return { dented: false, broken: false };
    if (dented) return { dented: true, broken: true };
    return { dented: true, broken: false };
  }

  private async _onCycleTrait(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const category = button.dataset.category;
    if (category === undefined) return;

    const next = CowboyBebopItemSheet.nextTraitState(button);
    await (this.actor as CowboyBebopActor).damageTrait(
      category,
      Number.parseInt(button.dataset.index ?? "0"),
      next.dented,
      next.broken
    );
  }

  private async _onCycleMonoTrait(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const next = CowboyBebopItemSheet.nextTraitState(button);

    await damageMonoTrait(
      this.monoFrom(button),
      Number.parseInt(button.dataset.index ?? "0"),
      next.dented,
      next.broken
    );
    this.render(false);
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

  private async _onAddRisque(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const points = Number.parseInt(
      (event.currentTarget as HTMLElement).dataset.value ?? "0"
    );
    await (this.actor as CowboyBebopActor).updateRisque(points);
  }

  /**
   * Solde la session : mouvement au premier, cartons et fausses notes à zéro.
   *
   * Confirmé, et le nombre de chasseurs touchés est annoncé dans la question :
   * ce bouton écrit sur des fiches que la prime ne possède pas, puisqu'un carton
   * suit celui qui l'a gagné. C'est le seul geste de ce système qui déborde
   * ainsi, donc il le dit avant de le faire.
   */
  private async _onResetSession(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const hunters = ((game as any).actors ?? []).filter(
      (actor: any) => actor.type === "chasseur"
    ).length;

    const { DialogV2 } = (foundry as any).applications.api;
    const confirmed = await DialogV2.confirm({
      window: {
        title: (game as any).i18n.localize("COWBOY.actor.resetSession"),
      },
      content: `<p>${escapeHtml(
        (game as any).i18n.format("COWBOY.actor.resetSessionConfirm", {
          hunters,
        })
      )}</p>`,
    });
    if (!confirmed) return;

    await resetSession(this.actor);
    this.render(false);
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
