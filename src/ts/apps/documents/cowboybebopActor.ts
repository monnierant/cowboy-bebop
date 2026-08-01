import { genres } from "../../constants";
import { Trait, Traits } from "../../types";
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
    rang: any,
    mouvement: any,
    advantage: number,
    traitsUsed: any
  ) {
    const roll = new CowboyBebopRoll(
      this._rolls.length,
      this,
      genre,
      category,
      rang,
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

    const target = (game as any).actors
      ?.filter((actor: any) => {
        return actor.system.isCurrentTarget && actor.type === "prime";
      })
      .at(0);

    if (!target) {
      ui.notifications?.warn("No target selected");
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

  public async actionCollectCarton(
    genre: string,
    cartons: number,
    notes: number
  ) {
    await this.collectNotes(genre, notes);
    await this.collectCartons(genre, cartons);
  }


  public async collectNotes(genre: string, notes: number) {
    let newNotes = (this as any).system.notes;
    newNotes[genre] += notes;
    await this.update({
      "system.notes": newNotes,
    });
  }

  public async collectCartons(genre: string, cartons: number) {
    let newCartons = (this as any).system.cartons;
    newCartons[genre] += cartons;
    await this.update({
      "system.cartons": newCartons,
    });
  }

  public async setCurrentTarget(newTarget: boolean = true) {
    await this.update({
      "system.isCurrentTarget": newTarget,
    });
    if (newTarget) {
      (game as any).actors
        ?.filter(
          (actor: CowboyBebopActor) =>
            actor.id !== this.id && actor.type === "prime"
        )
        .forEach((actor: CowboyBebopActor) => {
          actor.setCurrentTarget(false);
        });
    }
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

  public async addToken(genre: string, type: string, value: number) {
    const tokens = (this as any).system[type];

    console.log(type);
    console.log((this as any).system);
    tokens[genre] = Math.max(0, tokens[genre] + value);

    switch (type) {
      case "cartons":
        await this.update({
          "system.cartons": tokens,
        });
        break;
      case "notes":
        await this.update({
          "system.notes": tokens,
        });
        break;
    }
  }
}
