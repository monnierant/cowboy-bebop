import { genres, SESSION_TRAITS } from "../../constants";
import { adjust } from "../../economy";
import { getActivePrime, isActivePrime, setActivePrime } from "../../prime";
import { Settlement, SessionTrait, Trait, Traits } from "../../types";
import CowboyBebopRollDialog from "../dialog/cowboybebopRollDialog";
import CowboyBebopRoll from "../rolls/cowboybebopRoll";

export default class CowboyBebopActor extends Actor {
  private _rolls: CowboyBebopRoll[] = [];

  //=============================================================================
  // PC
  //=============================================================================

  // ========================================
  // Common
  // ========================================
  public async actionRemoveRoll(
    html: JQuery,
    element: HTMLInputElement,
    rollId: number
  ) {
    this._rolls[rollId].deletePreviousMessage();
    this.removeMessage(html, element);
  }

  // ========================================
  // Roll
  // ========================================
  public async roll(
    genre: string,
    category: string,
    mouvementIndex: number,
    mouvement: any,
    advantage: number,
    traitsUsed: any
  ) {
    const roll = new CowboyBebopRoll(
      this._rolls.length,
      this,
      genre,
      category,
      mouvementIndex,
      mouvement,
      advantage,
      traitsUsed
    );
    this._rolls.push(roll);
    await roll.roll();
    await roll.toMessage();
  }

  // ========================================
  // Actions
  // ========================================

  public async restoreTraits() {
    await this.update({
      "system.traits": this.restoreTraitImut((this as any).system.traits),
    });
  }

  public async actionDamageCartridge(
    html: JQuery,
    element: HTMLInputElement,
    rollId: number
  ) {
    await this.updateCartridge(-1);
    this._rolls[rollId].actionRemoveNote();
    this.removeMessage(html, element);
  }

  public async actionDamageTrait(
    html: JQuery,
    element: HTMLInputElement,
    rollId: number,
    category: string,
    traitToDamage: string
  ) {
    const index = (this as any).system.traits[category].findIndex(
      (trait: Trait) => trait.name === traitToDamage
    );

    this.damageTrait(category, index, true, false);
    this._rolls[rollId].actionRemoveNoteByTrait(traitToDamage);
    this.removeMessage(html, element);
  }

  public async actionHyperDamageTrait(
    html: JQuery,
    element: HTMLInputElement,
    rollId: number,
    category: string,
    traitToDamage: string
  ) {
    const index = (this as any).system.traits[category].findIndex(
      (trait: Trait) => trait.name === traitToDamage
    );

    await this._rolls[rollId].reRoll(traitToDamage);
    this.damageTrait(
      category,
      index,
      true,
      this._rolls[rollId].getCarton() < 2
    );
    this._rolls[rollId].toMessage();
    this.removeMessage(html, element);
  }

  public removeMessage(html: JQuery, element: HTMLInputElement) {
    const parent = html.find(element).parents("li.chat-message");

    parent.remove();
  }

  // ========================================
  // Preparation
  // ========================================
  // Dice Pool
  public prepareDicePool(category: string) {
    // Get the traits
    const traits = (this as any).system.traits[category];
    // Get the dice pool
    const dicePool = traits
      .filter((trait: Trait) => !trait.damaged)
      .filter((trait: Trait) => trait.name != "")
      .map((trait: Trait) => trait.name);

    const target = getActivePrime();

    if (!target) {
      ui.notifications?.warn(
        (game as any).i18n.localize("COWBOY.actor.noActivePrime")
      );
      return;
    }

    const dialog = new CowboyBebopRollDialog(
      target.system.genre,
      category,
      target.system.mouvement,
      this,
      dicePool
    );

    dialog.render(true);
    console.log("dialogOpened");
  }

  // ========================================
  // Update
  // ========================================
  // Damage Cartridge
  public async updateCartridge(points: number) {
    // Save the new data
    await this.update({
      "system.cartridge": (this as any).system.cartridge + points,
    });
  }

  // Adjust Rythme
  /**
   * Moves the rhythm by `points`. A negative rhythm is not a state the sheet
   * can show or a roll can read, so the floor is enforced here rather than
   * trusting the button that happens to be disabled at zero.
   */
  public async updateRythme(points: number) {
    const rythme = Math.max(0, ((this as any).system.rythme ?? 0) + points);
    if (rythme === (this as any).system.rythme) return;

    await this.update({ "system.rythme": rythme });
  }

  // Rename Trait
  public async renameTrait(category: string, index: number, newName: string) {
    // Save the new data
    await this.update({
      "system.traits": this.renameTraitImut(
        (this as any).system.traits,
        category,
        index,
        newName
      ),
    });
  }

  // Damaged Trait
  public async damageTrait(
    category: string,
    index: number,
    newDamaged: boolean,
    hyperDamaged: boolean = false
  ) {
    // Save the new data
    await this.update({
      "system.traits": this.damageTraitImut(
        (this as any).system.traits,
        category,
        index,
        newDamaged,
        hyperDamaged
      ),
    });
  }

  // ========================================
  // Helpers
  // ========================================
  private renameTraitImut(
    traits: Traits,
    category: string,
    index: number,
    newName: string
  ): Traits {
    if (traits[category] && traits[category][index]) {
      return {
        ...traits,
        [category]: traits[category].map((trait: Trait, i: number) =>
          i === index ? { ...trait, name: newName } : trait
        ),
      };
    } else {
      console.error("Trait or category not found");
      return traits;
    }
  }

  private damageTraitImut(
    traits: Traits,
    category: string,
    index: number,
    newDamaged: boolean,
    newHyperDamaged: boolean = false
  ): Traits {
    if (traits[category] && traits[category][index]) {
      return {
        ...traits,
        [category]: traits[category].map((trait: Trait, i: number) =>
          i === index
            ? { ...trait, damaged: newDamaged, hyperdamaged: newHyperDamaged }
            : trait
        ),
      };
    } else {
      console.error("Trait or category not found");
      return traits;
    }
  }

  private restoreTraitImut(traits: Traits): any {
    let result: Traits = new Object() as Traits;

    genres.forEach((category: string) => {
      result[category] = traits[category].map((trait: Trait) => {
        return { ...trait, damaged: false, hyperdamaged: false };
      });
    });

    return result;
  }

  //=============================================================================
  // NPC
  //=============================================================================

  /**
   * Settles a roll. Cartons stay with the hunter who produced them; false notes
   * collect on the prime currently in play.
   *
   * Crediting the prime is a write on a document no player owns, so the whole
   * settlement is the GM's gesture. The chat card offers it to them alone
   * rather than letting a player press a button that would throw.
   *
   * Returns what was actually credited and to whom, so the caller can leave
   * that account in the chat log; `undefined` when nothing was written.
   */
  public async actionCollect(
    genre: string,
    cartons: number,
    notes: number
  ): Promise<Settlement | undefined> {
    if (!(game as any).user?.isGM) return undefined;

    // Validate the whole settlement before writing either pool. Otherwise a
    // missing prime would credit the cartons, leave the card in chat, and
    // credit those same cartons again when the GM retried.
    const prime = notes > 0 ? getActivePrime() : undefined;
    if (notes > 0 && !prime) {
      ui.notifications?.warn(
        (game as any).i18n.localize("COWBOY.actor.noActivePrime")
      );
      return undefined;
    }

    if (cartons > 0) await adjust(this, "cartons", genre, cartons);
    if (notes > 0) await adjust(prime, "notes", genre, notes);

    return {
      genre,
      cartons,
      notes,
      hunterName: this.name ?? "",
      primeName: prime?.name ?? "",
    };
  }

  public async setActive() {
    await setActivePrime(this);
  }

  /** Takes this prime out of play, leaving the table without an active prime. */
  public async setInactive() {
    if (!isActivePrime(this)) return;
    await setActivePrime(undefined);
  }


  public async setGenre(genre: string) {
    await this.update({
      "system.genre": genre,
    });
  }

  public async setMouvement(mouvement: number) {
    await this.update({
      "system.mouvement": mouvement,
    });
  }

  /** The GM's correction, for when a roll was read wrong or a slice misplaced. */
  public async addToken(genre: string, type: string, value: number) {
    if (type !== "cartons" && type !== "notes") return;
    await adjust(this, type, genre, value);
  }

  // ========================================
  // Session
  // ========================================

  /**
   * The three session traits, as they are rather than as they may be stored:
   * a prime made before the field existed has none, and the sheet still has to
   * draw three lines for the GM to write on.
   */
  public sessionTraits(): SessionTrait[] {
    const stored: SessionTrait[] = (this as any).system.sessionTraits ?? [];
    return Array.from({ length: SESSION_TRAITS }, (_unused, index) => ({
      name: stored[index]?.name ?? "",
      revealed: stored[index]?.revealed === true,
    }));
  }

  public secret(): { text: string; revealed: boolean } {
    const stored = (this as any).system.secret ?? {};
    return {
      text: stored.text ?? "",
      revealed: stored.revealed === true,
    };
  }

  public async renameSessionTrait(index: number, name: string) {
    await this.updateSessionTrait(index, (trait) => ({ ...trait, name }));
  }

  public async revealSessionTrait(index: number, revealed: boolean) {
    await this.updateSessionTrait(index, (trait) => ({ ...trait, revealed }));
  }

  public async revealSecret(revealed: boolean) {
    await this.update({ "system.secret.revealed": revealed });
  }

  // Foundry replaces an array wholesale rather than merging into it, so the
  // whole of it is read, changed and written back - the same shape the trait
  // helpers above already use.
  private async updateSessionTrait(
    index: number,
    change: (trait: SessionTrait) => SessionTrait
  ) {
    const traits = this.sessionTraits();
    if (index < 0 || index >= traits.length) return;

    await this.update({
      "system.sessionTraits": traits.map((trait, i) =>
        i === index ? change(trait) : trait
      ),
    });
  }

}
