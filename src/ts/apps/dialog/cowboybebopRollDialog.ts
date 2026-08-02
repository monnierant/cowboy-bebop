import CowboyBebopActor from "../documents/cowboybebopActor";
import { moduleId, mouvements } from "../../constants";
import { Mouvement } from "../../types";
import CowboyBebopRoll from "../rolls/cowboybebopRoll";

export default class CowboyBebopRollDialog extends Dialog {
  // ========================================
  // Constructor
  // ========================================
  constructor(
    genre: string,
    category: string,
    mouvementIndex: number,
    actor: CowboyBebopActor,
    dicePool: string[],
    options: any = {},
    data: any = {}
  ) {
    // Call the parent constructor

    const _options = {
      ...options,
      ...{
        title: "Roll Dice Pool",
        buttons: {
          rollButton: {
            label: "Roll",
            callback: (html: JQuery) => {
              console.log("Roll");
              this._onRoll(html);
            },
            icon: '<i class="fas fa-dice"></i>',
          },
          cancelButton: {
            label: "Cancel",
            icon: '<i class="fa-solid fa-ban"></i>',
          },
        },
      },
    };
    console.log(_options);

    super(_options, data);

    // Set the actor
    this.actor = actor;
    this.genre = genre;
    this.category = category;
    this.mouvementIndex = mouvementIndex;

    this.dicePool = dicePool;
  }

  // ========================================
  // Properties
  // ========================================
  public actor: CowboyBebopActor;
  public dicePool: string[];
  public genre: string;
  public category: string;
  public roll: CowboyBebopRoll | undefined;
  public mouvementIndex: number;

  // Define the template to use for this sheet
  override get template() {
    return `systems/${moduleId}/templates/dialog/roll.hbs`;
  }

  // Data to be passed to the template when rendering
  override getData() {
    let data: any = super.getData();
    data.isGM = (game as Game).user?.isGM;
    data.actor = this.actor;
    data.dicePool = this.dicePool;
    data.genre = this.genre;
    data.category = this.category;
    data.mouvementIndex = this.mouvementIndex;
    data.mouvement = mouvements[this.mouvementIndex];
    data.mouvements = mouvements;
    return data;
  }

  // ========================================
  // Actions
  // ========================================
  // Roll the dice
  private async _onRoll(html: JQuery) {
    // Roll the dice
    const index = parseInt(
      html.find(".cowboy-dialog-mouvement").val() as string
    );
    const mouvement: Mouvement = mouvements[index ?? 0];
    const advantage =
      parseInt(
        html.find(".cowboy-dialog-modifier-advantage").val() as string
      ) ?? 0;
    const traitsUsed = html
      .find(".cowboy-dialog-dice-pool > input[type='checkbox']:checked")
      .toArray();

    await this.actor.roll(
      this.genre,
      this.category,
      index,
      mouvement,
      advantage,
      traitsUsed.map((trait) => trait.dataset.dice)
    );
  }
}
