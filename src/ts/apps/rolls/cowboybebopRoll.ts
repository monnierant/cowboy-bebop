import { Evaluated } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/dice/roll";
import { moduleId } from "../../constants";
import CowboyBebopActor from "../documents/cowboybebopActor";

export default class CowboyBebopRoll {
  constructor(
    public index: number,
    public actor: CowboyBebopActor,
    public genre: string,
    public category: string,
    public mouvementIndex: number,
    public mouvement: any,
    public advantage: number,
    public traitsUsed: any
  ) {
    this._actor = actor;
    this._genre = genre;
    this._category = category;
    this._mouvementIndex = mouvementIndex;
    this._mouvement = mouvement;

    this._advantage = advantage;
    this._traitsUsed = traitsUsed;

    this._result = undefined;

    const bonus = this.genre === this.category ? 1 : 0;

    const advantageInstruction = ["dh", "", "dl"];

    const diceOptions = {
      nb:
        this._mouvement.dices +
        this._traitsUsed.length +
        Math.abs(this._advantage) +
        bonus,
      advantage: advantageInstruction[this._advantage + 1],
    };

    this._roll = new Roll(`${diceOptions.nb}d6${diceOptions.advantage}`);
  }

  private _roll: Roll;
  private _actor: CowboyBebopActor;
  private _genre: string;
  private _category: string;
  private _mouvementIndex: number;
  private _mouvement: any;
  private _advantage: number;
  private _bonus: any;
  private _traitsUsed: string[];
  private _result: Evaluated<Roll<{}>> | undefined;
  private _carton: number = 0;
  private _notes: number = 0;
  private _dices: Roll[] = [];
  private _message: ChatMessage | undefined;

  public async reRoll(traitToDamage: string) {
    this._traitsUsed = this._traitsUsed.filter((e) => e !== traitToDamage);

    const bonus = this.genre === this.category ? 1 : 0;
    const advantageInstruction = ["dh", "", "dl"];
    const diceOptions = {
      nb:
        this._mouvement.dices +
        this._traitsUsed.length +
        Math.abs(this._advantage) +
        bonus,
      advantage: advantageInstruction[this._advantage + 1],
    };
    this._roll = new Roll(`${diceOptions.nb}d6${diceOptions.advantage}`);
    this.roll();
  }

  public async roll() {
    this._result = await this._roll.roll();

    console.log(this._result);

    this._dices = this._result.terms
      .map((e: any) => e.results)
      .flat()
      .filter((e: any) => e.active);
    console.log("let's go", this._dices);

    this._carton =
      (this._result.total >= this._mouvement.difficulty ? 1 : 0) +
      (this._dices.filter((e: any) => e.result === 6).length >= 2 ? 1 : 0);

    this._notes =
      this._dices.filter((e: any) => e.result === 1).length > 0
        ? this._dices.filter((e: any) => e.result === 1).length
        : this._mouvement.notes;
  }

  public async toMessage() {
    const content = await renderTemplate(
      `systems/${moduleId}/templates/chat/roll.hbs`,
      {
        rollId: this.index,
        actor: this._actor,
        genre: this._genre,
        category: this._category,
        mouvementIndex: this._mouvementIndex,
        mouvement: this._mouvement,
        advantage: this._advantage,
        bonus: this._bonus,
        traitsUsed: this._traitsUsed,
        result: this._result,
        carton: this._carton,
        notes: this._notes,
      }
    );

    this.deletePreviousMessage();

    this._message = await this._roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
    });
  }

  public async deletePreviousMessage() {
    if (this._message !== undefined) {
      this._message.delete();
      // (game as any).messages?.delete(this._message?.id);
    }
  }

  public async actionRemoveNote() {
    this._notes -= 1;
    this.toMessage();
  }

  public async actionRemoveNoteByTrait(trait: string) {
    this._traitsUsed = this._traitsUsed.filter((e) => e !== trait);
    this.actionRemoveNote();
  }

  public async collectAll() {
    this._carton = 0;
    this._notes = 0;
    this.toMessage();
  }

  public getCarton() {
    return this._carton;
  }

  public getNotes() {
    return this._notes;
  }
}
