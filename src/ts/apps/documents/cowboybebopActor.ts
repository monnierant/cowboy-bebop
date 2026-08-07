import { CARTRIDGES, genres, SESSION_TRAITS, soloRiff } from "../../constants";
import { adjust } from "../../economy";
import { riffsForPhase } from "../../riffs";
import { PlayableRiff, confirmPlayOption, payOption, playable } from "../../riffPlay";
import { damageMonoTrait, monoOf, monoPoolTraits } from "../../mono";
import { bespokeRulesOf } from "../../grooves";
import { getActivePrime, isActivePrime, setActivePrime } from "../../prime";
import {
  PoolTrait,
  Activation,
  ActiveActivation,
  BespokeGrooveRules,
  Settlement,
  SessionTrait,
  Trait,
  Traits,
} from "../../types";
import { Advantage } from "../../rolls/score";
import {
  Assist,
  PlayedRiff,
  TestGroove,
  TestMouvement,
} from "../../rolls/testState";
import CowboyBebopRollDialog from "../dialog/cowboybebopRollDialog";
import { postTest } from "../rolls/testCard";
import { expireActivations } from "../../grooves";

export default class CowboyBebopActor extends Actor {
  //=============================================================================
  // PC
  //=============================================================================

  // ========================================
  // Roll
  // ========================================
  /**
   * Lance un test et pose sa carte dans le chat.
   *
   * Le jet ne survit pas à cet appel : tout ce qu'il devient vit sur la carte
   * (ADR 0007). C'est ce qui a remplacé le tableau `_rolls` que cet acteur
   * gardait en mémoire, et qui n'existait que chez le client qui avait lancé.
   */
  public async roll(
    genre: string,
    category: string,
    mouvementIndex: number,
    mouvement: TestMouvement,
    advantage: Advantage,
    bonusDice: number,
    traitsUsed: PoolTrait[],
    // Ce qui a été plaqué et payé avant que les dés tombent, et la dette qu'un
    // camarade a contractée pour ce test sans que rien ne l'en débite.
    played: PlayedRiff[] = [],
    assist?: Assist,
    // Les grooves qui étaient sur la table quand les dés sont tombés : le sien,
    // et celui qu'un Jam ! lui a prêté. La carte les rappelle sans les rejouer.
    grooves: TestGroove[] = [],
    // Les Activations en cours sur la prime au moment du lancer, gelées avec le
    // nom du groove qui les a posées.
    running: ActiveActivation[] = [],
    activations: Activation[] = [],
    grooveRules: BespokeGrooveRules = {},
    canReservePlan: boolean = false,
    plannedDie?: number
  ) {
    await postTest(this, {
      actorId: this.id ?? "",
      genre,
      category,
      mouvementIndex,
      mouvement,
      advantage,
      bonusDice,
      traits: traitsUsed,
      played,
      assist,
      grooves,
      running,
      activations,
      grooveRules,
      canReservePlan,
      plannedDie,
    });
  }

  // ========================================
  // Solo !
  // ========================================

  /**
   * Ce que Solo ! offre à ce chasseur en ce moment, ou rien.
   *
   * Le seul riff qui ne se joue ni dans la boîte de jet ni sur une carte :
   * « avant ou après un test », « même s'il n'intervient pas dans le test ».
   * Sa place est donc la fiche, et sa disponibilité se lit comme celle des
   * autres - sur la prime active, au mouvement en cours.
   */
  public soloOffer(): PlayableRiff | undefined {
    const prime = getActivePrime();
    if (!prime) return undefined;

    const open = riffsForPhase(
      prime,
      Number(prime.system?.mouvement ?? 0),
      "hunter",
      "sheet"
    ).filter((riff) => riff.id === soloRiff);

    return playable(open, this, {}, bespokeRulesOf(prime))[0];
  }

  /** Le solo a-t-il déjà été joué cette session ? */
  public soloPlayed(): boolean {
    return (this as any).system?.solo === true;
  }

  /**
   * Joue le solo : un point de rythme contre un carton du genre de la session.
   *
   * « Il gagne et dépense immédiatement un carton. » Le carton est crédité et
   * non dépensé : le dépenser signifierait le poser sur un cadran, donc faire
   * dépendre un riff du module qui les porte (ADR 0001). Il rejoint la réserve
   * du chasseur et se dépense ensuite par le chemin habituel.
   */
  public async playSolo(): Promise<void> {
    const i18n = (game as any).i18n;
    const offer = this.soloOffer();
    if (!offer) return;

    if (this.soloPlayed()) {
      ui.notifications?.warn(i18n.localize("COWBOY.riffs.soloUsed"));
      return;
    }

    const genre = getActivePrime()?.system?.genre ?? "";
    if (!genres.includes(genre)) {
      ui.notifications?.warn(i18n.localize("COWBOY.riffs.noCarton"));
      return;
    }

    const available = offer.choices.filter((choice) => !choice.blocked);
    if (available.length === 0) return;
    let choice = available[0];
    if (available.length > 1) {
      const options = available.map((entry, index) =>
        `<option value="${index}">${(foundry as any).utils.escapeHTML(entry.label)}</option>`
      ).join("");
      const selected = await Dialog.prompt({
        title: offer.name,
        content: `<label>${i18n.localize("COWBOY.riffs.choosePayment")}<select name="payment">${options}</select></label>`,
        callback: (html: JQuery) => Number.parseInt(String(html.find("select[name='payment']").val() ?? "0")),
        rejectClose: false,
      } as any) as unknown as number | undefined;
      if (selected === undefined) return;
      choice = available[selected] ?? available[0];
    }
    if (!(await confirmPlayOption(offer.name, choice.payments))) return;

    // Le drapeau part avant le crédit : deux clics rapprochés doivent produire
    // un carton et non deux, et c'est lui qui ferme la porte.
    if (this.soloPlayed()) return;
    await this.update({ "system.solo": true });

    if (!(await payOption(choice.payments, this))) {
      await this.update({ "system.solo": false });
      return;
    }

    await adjust(this, "cartons", genre, 1);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this as any }),
      content: `<p>${i18n.format("COWBOY.riffs.soloDone", {
        name: this.name,
        genre,
      })}</p>`,
    } as any);
  }

  // ========================================
  // Actions
  // ========================================

  public async restoreTraits() {
    await this.update({
      "system.traits": this.restoreTraitImut((this as any).system.traits),
    });
  }

  /**
   * Use le trait qu'une carte désigne, où qu'il vive.
   *
   * Le trait porte son adresse complète plutôt que son nom : depuis qu'un MONO
   * verse ses propres traits dans la même réserve, deux homonymes seraient
   * indiscernables, et c'est exactement ce que la priorité de dégât a besoin de
   * distinguer.
   *
   * Quand cette écriture doit avoir lieu est décidé sur la carte, pas ici : ce
   * chasseur ne sait pas si le test avait encore une correction à donner.
   */
  public async damagePoolTrait(
    trait: PoolTrait | undefined,
    dented: boolean,
    broken: boolean
  ) {
    if (!trait) return;

    if (trait.source === "mono") {
      const mono =
        (foundry as any).utils?.fromUuidSync?.(trait.monoUuid) ?? monoOf(this);
      await damageMonoTrait(mono, trait.index, dented, broken);
      return;
    }

    await this.damageTrait(trait.category, trait.index, dented, broken);
  }

  // ========================================
  // Preparation
  // ========================================
  // Dice Pool
  /**
   * Ce que ce chasseur peut mettre sur la table pour un genre donné : ses
   * propres traits de ce genre, puis ceux de son MONO - qui n'ont pas de genre
   * et se proposent donc à tous les jets.
   */
  public prepareDicePool(category: string) {
    const target = getActivePrime();

    if (!target) {
      ui.notifications?.warn(
        (game as any).i18n.localize("COWBOY.actor.noActivePrime")
      );
      return;
    }

    // Les cinq approches partent, pas seulement celle qu'on a cliquée :
    // Improviser en ouvre une seconde en cours de réglage, et la boîte n'a plus
    // le moyen de redemander une réserve une fois qu'elle est ouverte. C'est
    // elle qui filtre sur les approches réellement en jeu.
    const dicePool: PoolTrait[] = genres
      .flatMap<PoolTrait>((approach) =>
        this.usableTraits(approach).map((entry) => ({
          key: `hunter:${approach}:${entry.index}`,
          name: entry.trait.name,
          source: "hunter" as const,
          category: approach,
          index: entry.index,
          monoUuid: "",
        }))
      )
      // Ceux du MONO n'ont pas de genre et se proposent donc à tous les jets :
      // ils portent une catégorie vide et la boîte ne les filtre jamais.
      .concat(this.dentedTraits())
      .concat(monoPoolTraits(monoOf(this)));

    const dialog = new CowboyBebopRollDialog(
      target.system.genre,
      category,
      target.system.mouvement,
      this,
      dicePool
    );

    dialog.render(true);
  }

  /** Les traits d'une approche qui donnent encore un dé. */
  private usableTraits(category: string): { trait: Trait; index: number }[] {
    return ((this as any).system.traits?.[category] ?? [])
      .map((trait: Trait, index: number) => ({ trait, index }))
      .filter(
        ({ trait }: { trait: Trait }) =>
          !trait.dented && !trait.broken && trait.name !== ""
      );
  }

  /**
   * Les traits abîmés de ce chasseur, tous genres confondus.
   *
   * Ce que Montrer ses blessures propose d'effacer. La réserve de jet ne peut
   * pas servir ici : elle ne contient par construction que des traits intacts,
   * et le livre dit « sur sa fiche de personnage », donc toutes les approches et
   * pas seulement celle du test. Un trait brisé n'y figure pas - « des dommages
   * sévères ne peuvent pas être effacés de cette manière » - et ceux d'un MONO
   * non plus : il a sa propre fiche, et ce riff parle de blessures (ADR 0009).
   */
  public dentedTraits(): PoolTrait[] {
    return genres.flatMap((category) =>
      ((this as any).system.traits?.[category] ?? [])
        .map((trait: Trait, index: number) => ({ trait, index }))
        .filter(
          ({ trait }: { trait: Trait }) =>
            trait.dented && !trait.broken && trait.name !== ""
        )
        .map(({ trait, index }: { trait: Trait; index: number }) => ({
          key: `hunter:${category}:${index}`,
          name: trait.name,
          source: "hunter" as const,
          category,
          index,
          monoUuid: "",
          dented: true,
        }))
    );
  }

  // ========================================
  // Update
  // ========================================
  // Damage Cartridge
  /**
   * Coche ou décoche une chambre du barillet.
   *
   * Six et pas plus, zéro et pas moins : le barillet n'a que six chambres, et
   * c'est en tirant la dernière que le chasseur doit affronter son passé. Le
   * plancher tient ici plutôt que dans le bouton qui se cache, pour la même
   * raison que `updateRythme`.
   */
  public async updateCartridge(points: number) {
    const cartridge = Math.min(
      CARTRIDGES,
      Math.max(0, ((this as any).system.cartridge ?? 0) + points)
    );
    if (cartridge === (this as any).system.cartridge) return;

    await this.update({ "system.cartridge": cartridge });
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
    dented: boolean,
    broken: boolean = false
  ) {
    // Save the new data
    await this.update({
      "system.traits": this.damageTraitImut(
        (this as any).system.traits,
        category,
        index,
        dented,
        broken
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
    if (traits[category]?.[index]) {
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
    dented: boolean,
    broken: boolean = false
  ): Traits {
    if (traits[category]?.[index]) {
      return {
        ...traits,
        [category]: traits[category].map((trait: Trait, i: number) =>
          i === index ? { ...trait, dented, broken } : trait
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
        return { ...trait, dented: false, broken: false };
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
    if (mouvement === Number((this as any).system?.mouvement ?? 0)) return;

    await this.update({
      "system.mouvement": mouvement,
    });
    await expireActivations(this, "mouvement");
  }

  /**
   * Déplace le risque de Big Shot, la réserve qu'il gagne à la mise en place et
   * dépense pour durcir un test.
   *
   * Plancher à zéro tenu ici plutôt que par le bouton qui se désactive : c'est
   * une réserve, pas un solde, et un risque négatif n'est un état qu'aucune
   * fiche ne sait montrer - exactement le raisonnement de `updateRythme`.
   */
  public async updateRisque(points: number) {
    const risque = Math.max(0, ((this as any).system.risque ?? 0) + points);
    if (risque === (this as any).system.risque) return;

    await this.update({ "system.risque": risque });
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
    const wasRevealed = this.secret().revealed;
    await this.update({ "system.secret.revealed": revealed });
    if (revealed && !wasRevealed) await expireActivations(this, "secret");
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
