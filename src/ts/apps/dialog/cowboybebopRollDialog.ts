import CowboyBebopActor from "../documents/cowboybebopActor";
import { colors, genres, moduleId, mouvements } from "../../constants";
import { Activation, Effect, Mouvement, Payment, PoolTrait } from "../../types";
import { dicePool, readAdvantage, withDifficulty } from "../../rolls/score";
import { rollEffects } from "../../rolls/activationTerms";
import { activeEffects, applyAdvantageEffects, conditionsMatch, isForbidden, permitsDentedTraits } from "../../rolls/activationTerms";
import { getActivePrime } from "../../prime";
import { riffsForPhase } from "../../riffs";
import { payOption, paymentLabel, paymentOptionLabel, playable, pledge } from "../../riffPlay";
import { Assist, PlayedRiff, TestGroove } from "../../rolls/testState";
import {
  grooveCard,
  activationsFor,
  grooveActivationsOf,
  grooveOf,
  substitutedApproaches,
  bespokeRulesOf,
  hasLongTermPlan,
} from "../../grooves";
import type { Substitution } from "../../types";
import { hunterPaymentOptions } from "../../rolls/bespokeGrooves";

/** Un riff plaqué dans cette boîte, et ce qu'il lui reste à préciser. */
interface PlayedEntry {
  id: string;
  name: string;
  /** Le paiement cliqué parmi ceux acceptés. Absent quand le riff est gratuit. */
  payment?: Payment;
  payments: Payment[];
  /** Prix du riff avant les conversions propres à l'assistant choisi. */
  basePayments: Payment[];
  owed: boolean;
  effects: Effect[];
  /** Assister et Jam ! : qui, sans jamais le débiter. */
  assistId?: string;
  /** Improviser : l'approche dont les traits rejoignent la réserve. */
  approach?: string;
  /** Montrer ses blessures : les traits qu'on efface au lancer. */
  heal: string[];
  healMax: number;
}

export default class CowboyBebopRollDialog extends Dialog {
  // ========================================
  // Constructor
  // ========================================
  constructor(
    genre: string,
    category: string,
    mouvementIndex: number,
    actor: CowboyBebopActor,
    dicePool: PoolTrait[],
    options: any = {},
    data: any = {}
  ) {
    const localize = (key: string, fallback: string) =>
      (game as any)?.i18n?.localize(key) ?? fallback;

    const _options = {
      ...options,
      ...{
        title: localize("COWBOY.roll.title", "Roll Dice Pool"),
        buttons: {
          rollButton: {
            label: localize("COWBOY.roll.roll", "Roll"),
            callback: (html: JQuery) => {
              void this._onRoll(html);
            },
            icon: '<i class="fas fa-dice"></i>',
          },
          cancelButton: {
            label: localize("COWBOY.roll.cancel", "Cancel"),
            icon: '<i class="fa-solid fa-ban"></i>',
          },
        },
      },
    };

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
  public dicePool: PoolTrait[];
  public genre: string;
  public category: string;
  public mouvementIndex: number;

  /**
   * Les riffs plaqués, dans l'ordre où on les a plaqués.
   *
   * Rien n'en est débité tant que la boîte n'est pas validée : c'est ce qui
   * permet de reprendre un riff posé par erreur, et ce qui fait du bouton
   * Lancer la seule confirmation nécessaire.
   */
  private played: PlayedEntry[] = [];

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
    // La même icône et la même couleur que ce genre porte sur la fiche, les
    // dés et les jetons, lues dans la table unique plutôt que redites ici.
    data.categoryColor = colors[this.category];
    data.mouvementIndex = this.mouvementIndex;
    data.mouvement = mouvements[this.mouvementIndex];
    data.mouvements = mouvements;
    const plannedDie = Math.trunc(Number((this.actor as any).system?.plannedDie ?? 0));
    data.plannedDie = plannedDie >= 1 && plannedDie <= 6 ? plannedDie : 0;
    return data;
  }

  // ========================================
  // Ce que les riffs plaqués ajoutent
  // ========================================

  /** Tous leurs effets bout à bout, cumulés par nature. */
  private playedEffects() {
    return rollEffects([
      ...this.played.flatMap((entry) => entry.effects),
      ...activeEffects(this.mechanicalActivations(), {
        advantage: 0,
        category: this.category,
        genre: this.genre,
      }),
    ]);
  }

  /** Même mécanique, quelle que soit son enveloppe Riff ou Groove. */
  private mechanicalActivations(advantage: -1 | 0 | 1 = 0): Activation[] {
    const prime = getActivePrime();
    const assist = this.assistOf();
    const assistant = assist ? (game as any).actors?.get(assist.actorId) : undefined;
    return [
      ...grooveActivationsOf(this.actor),
      ...grooveActivationsOf(assistant),
      ...grooveActivationsOf(prime),
      ...activationsFor(prime, this.category, this.genre, advantage),
    ];
  }

  private damageRemovalForbidden(advantage: -1 | 0 | 1 = 0): boolean {
    return isForbidden(activeEffects(this.mechanicalActivations(advantage), {
      advantage, category: this.category, genre: this.genre,
    }), "damageRemoval");
  }

  private applicableActivations(advantage: -1 | 0 | 1): Activation[] {
    return this.mechanicalActivations(advantage).filter((activation) =>
      conditionsMatch(activation.conditions, {
        advantage, category: this.category, genre: this.genre,
      })
    );
  }

  /** Les Activations en cours qui visent ce test, gelées au lancer. */
  private runningActivations() {
    return activationsFor(getActivePrime(), this.category, this.genre);
  }

  private effectiveAdvantage(html: JQuery) {
    const played = this.playedEffects();
    const combined = readAdvantage(
      readAdvantage(html.find(".cowboy-dialog-modifier-advantage").val()) +
        played.advantage
    );
    return applyAdvantageEffects(
      combined,
      activeEffects(this.mechanicalActivations(combined), {
        advantage: combined,
        category: this.category,
        genre: this.genre,
      })
    );
  }

  /**
   * Les approches en jeu : celle du test, celles qu'Improviser a ouvertes, et
   * celles qu'un groove substitue.
   *
   * Les traits d'un MONO ne passent pas par ici : ils n'ont pas de genre, donc
   * portent une catégorie vide et se proposent à tous les jets.
   *
   * La substitution est **automatique** : le livre dit « utiliser
   * systématiquement », donc il n'y a rien à plaquer. Les traits concernés
   * apparaissent simplement cochables, et le joueur choisit lesquels comme pour
   * les autres. Ce qu'elle ne fait jamais, c'est donner le dé de genre : celui-ci
   * reste `genre === category`, et c'est la même garde qu'Improviser - sans quoi
   * un groove deviendrait un moyen de l'acheter.
   */
  private approaches(): Set<string> {
    return new Set([
      this.category,
      ...this.played
        .map((entry) => entry.approach)
        .filter((approach): approach is string => Boolean(approach)),
      ...substitutedApproaches(this.actor, this.category, this.lentSubstitution()),
    ]);
  }

  /**
   * La substitution qu'un Jam ! prête à ce test, s'il y en a un.
   *
   * « Vous conférez aussi votre groove au test » : c'est la règle qui passe, pas
   * le matériel. Une substitution prêtée ouvre les traits **du lanceur** - ceux
   * de l'assistant resteraient sur sa fiche, et en entamer un pour corriger y
   * écrirait, ce que l'ADR 0009 interdit.
   *
   * Lue en direct sur l'assistant nommé dans le menu : tant que la boîte est
   * ouverte, changer d'assistant change le groove prêté.
   */
  private lentSubstitution(): Substitution | undefined {
    const assist = this.assistOf();
    if (!assist) return undefined;

    return grooveOf((game as any).actors?.get(assist.actorId))?.substitution;
  }

  /**
   * Les grooves que ce test met sur la table : celui du lanceur, et celui qu'un
   * Jam ! lui prête.
   *
   * Rappelés et non appliqués, pour ceux que le moteur ne joue pas : sept des
   * onze grooves de chasseur se déclenchent au réglage, et c'est ici qu'ils
   * doivent se lire.
   */
  private grooveCards(): TestGroove[] {
    const cards: TestGroove[] = [];

    const mine = grooveCard(this.actor);
    if (mine) {
      cards.push({ name: mine.name, description: mine.description, lentBy: "" });
    }

    const assist = this.assistOf();
    const lent = assist
      ? grooveCard((game as any).actors?.get(assist.actorId))
      : undefined;
    if (assist && lent) {
      cards.push({
        name: lent.name,
        description: lent.description,
        lentBy: (game as any).i18n.format("COWBOY.groove.lent", {
          name: assist.name,
        }),
      });
    }

    return cards;
  }

  // ========================================
  // Actions
  // ========================================

  /**
   * Tient le seuil et le compte de dés à jour pendant qu'on règle le test.
   *
   * Les deux sont toujours recalculés depuis le mouvement choisi et l'état
   * courant du formulaire, jamais incrémentés sur place : changer de mouvement
   * en cours de réglage doit repartir de son rang à lui, pas de ce qui restait
   * à l'écran. C'est la même raison qui fait relire les riffs plaqués en entier
   * plutôt que d'ajouter leurs effets au fil de l'eau.
   *
   * Le compte passe par `dicePool`, celui-là même qui construira la formule au
   * moment du jet. C'est ce qui garantit que le nombre annoncé est le nombre
   * lancé, plutôt qu'une addition parallèle à tenir en phase.
   */
  override activateListeners(html: JQuery) {
    super.activateListeners(html);

    const refresh = () => {
      // Les traits d'une approche qu'aucun Improviser n'ouvre plus quittent la
      // réserve, et sont décochés en partant : sans ça, reprendre Improviser
      // laisserait leurs dés dans le groupement sans que rien ne les montre.
      const approaches = this.approaches();
      const effective = this.effectiveAdvantage(html);
      const activationEffects = activeEffects(this.mechanicalActivations(effective), {
        advantage: effective,
        category: this.category,
        genre: this.genre,
      });
      const damagedAllowed = permitsDentedTraits(effective, activationEffects);
      html.find(".cowboy-dialog-dice-pool").each((_index, element) => {
        const row = element as HTMLElement;
        const category = row.dataset.category ?? "";
        const dented = row.dataset.dented === "true";
        const inPlay =
          (category === "" || approaches.has(category)) &&
          (!dented || damagedAllowed);

        row.classList.toggle("is-out", !inPlay);
        if (!inPlay) {
          row.querySelectorAll("input[type='checkbox']").forEach((box) => {
            (box as HTMLInputElement).checked = false;
          });
        }
      });

      const { mouvement, advantage, bonusDice, traits } = this.readForm(html);

      html
        .find(".cowboy-dialog-difficulty-total")
        .text(String(mouvement.difficulty));
      // Toujours signés, « +0 » compris : un écart nul qui n'écrit rien fait
      // sauter la rangée d'un cran chaque fois qu'on repasse par zéro.
      html.find(".cowboy-dialog-difficulty-delta").text(signed(mouvement.modifier));
      html.find(".cowboy-dialog-bonus-dice-total").text(signed(bonusDice));

      const pool = dicePool({
        mouvement,
        traits: traits.length,
        genreBonus: this.genre === this.category,
        advantage,
        bonusDice,
      });

      html.find(".cowboy-dialog-dice-total").text(String(pool.dice));
      html.find(".cowboy-dialog-dice-formula").text(pool.formula);

      void this.refreshRiffs(html, refresh);
    };

    html
      .find(".cowboy-dialog-mouvement, .cowboy-dialog-modifier-advantage")
      .on("change", refresh);
    html
      .find(".cowboy-dialog-dice-pool > input[type='checkbox']")
      .on("change", refresh);

    // Les deux compteurs marchent pareil : un pas, un champ caché qui le garde,
    // et tout l'affichage recalculé derrière.
    const stepper = (button: string, field: string) =>
      html.find(button).on("click", (event: Event) => {
        event.preventDefault();
        const step = Number.parseInt(
          (event.currentTarget as HTMLElement).dataset.value ?? "0"
        );
        const input = html.find(field);
        input.val(Number.parseInt((input.val() as string) ?? "0") + step);
        refresh();
      });

    stepper(".cowboy-dialog-difficulty-step", ".cowboy-dialog-difficulty-modifier");
    stepper(".cowboy-dialog-bonus-dice-step", ".cowboy-dialog-bonus-dice-value");

    refresh();
  }

  /**
   * Redessine la section des riffs, puis se rebranche dessus.
   *
   * Refaite en entier à chaque geste parce que tout la change : le mouvement
   * choisi décide des riffs ouverts, et chaque riff plaqué change ce que les
   * suivants coûtent encore. Rien de ce qu'elle contient n'est un champ qu'il
   * faudrait préserver - ce qui a été choisi vit dans `this.played`, pas dans
   * le HTML.
   */
  private async refreshRiffs(html: JQuery, refresh: () => void): Promise<void> {
    const mount = html.find(".cowboy-dialog-riffs-mount");
    if (mount.length === 0) return;

    mount.html(await this.renderRiffs(html));
    this.wireRiffs(html, refresh);

    // La boîte grandit et rétrécit en cours de réglage - un riff plaqué ouvre
    // une liste de traits, un riff repris la referme. Foundry ne mesure une
    // fenêtre qu'au rendu, donc sans ça le contenu déborderait sous le bouton
    // Lancer, qui est précisément ce qu'on doit pouvoir atteindre.
    this.setPosition({ height: "auto" } as any);
  }

  private async renderRiffs(html: JQuery): Promise<string> {
    const prime = getActivePrime();

    // Les riffs ouverts sont relus en direct sur la prime active, et au
    // mouvement choisi **dans cette boîte** - pas celui de la prime, qu'on est
    // peut-être en train de changer dans le menu juste au-dessus.
    const open = prime
      ? riffsForPhase(prime, this.chosenMouvement(html), "hunter", "roll")
      : [];

    const dented = this.actor.dentedTraits();

    return renderTemplate(`systems/${moduleId}/templates/dialog/riff-play.hbs`, {
      // Ce qui est déjà promis compte comme dépensé : sans ça, un chasseur à une
      // cartouche pourrait plaquer S'impliquer trois fois et ne le découvrir
      // qu'au moment de payer.
      open: playable(
        open,
        this.actor,
        pledge(this.played.flatMap((e) => e.payments)),
        bespokeRulesOf(getActivePrime())
      )
        .map((riff) => this.damageRemovalForbidden() && rollEffects(riff.effects).heal > 0
          ? {
              ...riff,
              stuck: true,
              choices: riff.choices.map((choice) => ({
                ...choice,
                blocked: (game as any).i18n.localize("COWBOY.activation.damageRemovalForbidden"),
              })),
            }
          : riff),
      played: this.played.map((entry, index) =>
        this.playedRow(entry, index, dented)
      ),
      // Redessinés avec les riffs, et pour la même raison : le groove prêté suit
      // le menu d'assistance, qui est dans ce bloc.
      grooves: this.grooveCards(),
      running: this.runningActivations(),
      totalLabel: this.totalLabel(),
    });
  }

  /** Une ligne de riff plaqué, avec ce qu'il lui reste à préciser. */
  private playedRow(entry: PlayedEntry, index: number, dented: PoolTrait[]) {
    const i18n = (game as any).i18n;
    const effects = rollEffects(entry.effects);

    return {
      index,
      name: entry.name,
      costLabel: paymentOptionLabel(entry.payments),

      needsAssist: entry.owed && effects.advantage !== 0,
      assistOptions: this.assistOptions(entry.assistId),
      assistPayments: entry.assistId
        ? hunterPaymentOptions(
            [entry.basePayments],
            entry.assistId,
            bespokeRulesOf(getActivePrime())
          ).map((payments, choice) => ({
            choice,
            label: paymentOptionLabel(payments),
            selected: paymentOptionLabel(payments) === paymentOptionLabel(entry.payments),
          }))
        : [],
      assistNote:
        entry.assistId && entry.payments.length > 0
          ? i18n.format("COWBOY.riffs.assistOwed", {
              name: this.hunterName(entry.assistId),
              cost: paymentOptionLabel(entry.payments),
            })
          : "",

      needsApproach: effects.approach > 0,
      approachOptions: this.approachOptions(entry.approach),

      needsHeal: entry.healMax > 0,
      healHint: i18n.format("COWBOY.riffs.healHint", { count: entry.healMax }),
      healOptions: dented.map((trait) => ({
        key: trait.key,
        name: trait.name,
        category: trait.category,
        selected: entry.heal.includes(trait.key),
        // Passé le compte que le riff paie, les cases restantes se ferment : on
        // n'efface pas trois dommages avec un riff qui en efface deux.
        blocked:
          !entry.heal.includes(trait.key) && entry.heal.length >= entry.healMax,
      })),
    };
  }

  /**
   * Les autres chasseurs, avec ce qu'il leur reste de rythme.
   *
   * Le rythme est montré mais rien ne le vérifie : ce n'est pas nous qui
   * payons, et une réserve lue chez quelqu'un d'autre n'engage personne
   * (ADR 0009). C'est un repère pour la table, pas une garde.
   */
  private assistOptions(chosen?: string) {
    const i18n = (game as any).i18n;

    return ((game as any).actors ?? [])
      .filter(
        (actor: any) => actor.type === "chasseur" && actor.id !== this.actor.id
      )
      .map((actor: any) => ({
        value: actor.id,
        label: i18n.format("COWBOY.riffs.assistRythme", {
          name: actor.name,
          rythme: Number(actor.system?.rythme ?? 0),
        }),
        selected: actor.id === chosen,
      }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label));
  }

  /** Les approches qu'Improviser peut ouvrir : toutes sauf celle du test. */
  private approachOptions(chosen?: string) {
    return genres
      .filter((approach) => approach !== this.category)
      .map((approach) => ({
        value: approach,
        label: approach,
        selected: approach === chosen,
      }));
  }

  private hunterName(actorId: string): string {
    return (game as any).actors?.get(actorId)?.name ?? "";
  }

  /** Ce que Lancer va débiter, ramassé par ressource. */
  private totalLabel(): string {
    const mine = this.played.filter((entry) => !entry.owed);
    const totals = pledge(mine.flatMap((entry) => entry.payments));

    return Object.entries(totals)
      .map(([resource, amount]) =>
        paymentLabel({
          resource: resource as Payment["resource"],
          amount: amount ?? 0,
        })
      )
      .join(", ");
  }

  private wireRiffs(html: JQuery, refresh: () => void): void {
    const indexOf = (element: HTMLElement) =>
      Number.parseInt(element.dataset.index ?? "-1");

    html.find(".cowboy-riff-play-button").on("click", (event) => {
      event.preventDefault();
      const button = event.currentTarget as HTMLElement;
      this.play(
        html,
        button.dataset.riff ?? "",
        Number.parseInt(button.dataset.choice ?? "0")
      );
      refresh();
    });

    html.find(".cowboy-riff-undo").on("click", (event) => {
      event.preventDefault();
      const index = indexOf(event.currentTarget as HTMLElement);
      this.played = this.played.filter((_entry, i) => i !== index);
      refresh();
    });

    html.find(".cowboy-riff-assist").on("change", (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      const entry = this.played[indexOf(select)];
      if (entry) {
        entry.assistId = select.value || undefined;
        const choices = entry.assistId
          ? hunterPaymentOptions([entry.basePayments], entry.assistId, bespokeRulesOf(getActivePrime()))
          : [entry.basePayments];
        entry.payments = choices[0] ?? [];
        entry.payment = entry.payments[0];
      }
      refresh();
    });

    html.find(".cowboy-riff-assist-payment").on("change", (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      const entry = this.played[indexOf(select)];
      if (!entry?.assistId) return;
      const choices = hunterPaymentOptions(
        [entry.basePayments],
        entry.assistId,
        bespokeRulesOf(getActivePrime())
      );
      entry.payments = choices[Number.parseInt(select.value)] ?? choices[0] ?? [];
      entry.payment = entry.payments[0];
      refresh();
    });

    html.find(".cowboy-riff-approach").on("change", (event) => {
      const select = event.currentTarget as HTMLSelectElement;
      const entry = this.played[indexOf(select)];
      if (entry) entry.approach = select.value;
      refresh();
    });

    html.find(".cowboy-riff-heal-toggle").on("change", (event) => {
      const box = event.currentTarget as HTMLInputElement;
      const entry = this.played[indexOf(box)];
      if (!entry) return;

      const key = box.dataset.trait ?? "";
      entry.heal = box.checked
        ? [...entry.heal, key].slice(0, entry.healMax)
        : entry.heal.filter((candidate) => candidate !== key);
      refresh();
    });
  }

  /** Plaque un riff, sans rien débiter : c'est Lancer qui paie. */
  private play(html: JQuery, id: string, choice: number): void {
    const prime = getActivePrime();
    if (!prime) return;

    const riff = riffsForPhase(
      prime,
      this.chosenMouvement(html),
      "hunter",
      "roll"
    ).find((candidate) => candidate.id === id);
    if (!riff) return;

    const effects = rollEffects(riff.effects);
    const transformed = riff.owed
      ? riff.paymentOptions
      : hunterPaymentOptions(
          riff.paymentOptions,
          String(this.actor.id ?? ""),
          bespokeRulesOf(getActivePrime())
        );
    const chosenPayments = transformed[choice] ?? [];
    const basePayments = riff.owed
      ? (riff.paymentOptions[choice] ?? [])
      : chosenPayments;

    this.played.push({
      id: riff.id,
      name: riff.name,
      // L'option choisie s'applique en entier ; `payment` n'en garde que la
      // première dépense, pour la carte qui n'affiche qu'un libellé.
      payments: chosenPayments,
      basePayments,
      payment: chosenPayments[0],
      owed: riff.owed,
      effects: riff.effects,
      // Une seconde approche préchoisie sur la première qui n'est pas celle du
      // test : un menu qui s'ouvre sur du vide se lit comme un réglage manquant.
      approach:
        effects.approach > 0
          ? genres.find((approach) => approach !== this.category)
          : undefined,
      heal: [],
      healMax: Math.max(0, effects.heal),
    });
  }

  /** Le mouvement que le menu montre, à défaut celui que la prime a ouvert. */
  private chosenMouvement(html: JQuery): number {
    // `parseInt` rend NaN et non `undefined`, donc `?? 0` ne rattrape rien : un
    // champ illisible désignerait `mouvements[NaN]`, puis lancerait une formule
    // `NaNd6undefined`.
    const chosen = Number.parseInt(
      html.find(".cowboy-dialog-mouvement").val() as string
    );
    return mouvements[chosen] ? chosen : this.mouvementIndex;
  }

  /**
   * Ce que la boîte dit en ce moment, lu en un seul endroit.
   *
   * L'aperçu du groupement et le jet lui-même lisent d'ici, donc le nombre
   * annoncé est le nombre lancé - ce qu'une seconde lecture, écrite à côté,
   * cesserait de garantir au premier champ ajouté.
   */
  private readForm(html: JQuery) {
    const index = this.chosenMouvement(html);
    const played = this.playedEffects();

    // Le mouvement part au jet avec son seuil déjà corrigé : tout ce qui suit -
    // le compte des cartons comme l'affichage de la carte - lit `difficulty`
    // sans avoir à connaître l'existence de ce réglage. L'écart réglé à la main
    // et celui qu'un riff apporte s'additionnent avant d'y entrer.
    const manualDifficulty = Number.parseInt(
      html.find(".cowboy-dialog-difficulty-modifier").val() as string
    );
    const mouvement: Mouvement & { modifier: number } = withDifficulty(
      mouvements[index],
      (Number.isFinite(manualDifficulty) ? manualDifficulty : 0) +
        played.difficulty
    );

    const parsedBonus = Number.parseInt(
      html.find(".cowboy-dialog-bonus-dice-value").val() as string
    );
    const manualBonus = Number.isFinite(parsedBonus) ? parsedBonus : 0;

    // Les cases ne portent que la clef du trait ; l'objet complet est repris
    // dans la réserve d'origine, seul endroit qui sait d'où chaque dé vient.
    // Une approche qui n'est plus en jeu ne compte pas, même si sa case avait
    // été cochée avant qu'on reprenne l'Improviser qui l'avait ouverte.
    const checked = new Set(
      html
        .find(
          ".cowboy-dialog-dice-pool:not(.is-out) > input[type='checkbox']:checked"
        )
        .toArray()
        .map((box) => box.dataset.dice)
    );

    return {
      index,
      mouvement,
      // Le menu et les riffs disent la même chose dans la même unité, donc ils
      // s'additionnent avant d'être bornés : un avantage plaqué sur un
      // désavantage réglé à la main s'annule, comme à la table.
      advantage: this.effectiveAdvantage(html),
      // Le compteur libre porte ce que Big Shot accorde au jugé ; les riffs
      // ajoutent le leur par-dessus. Les deux font partie du groupement, donc
      // une relance de Quitte ou double les garde tous les deux.
      bonusDice: manualBonus + played.dice,
      traits: this.dicePool.filter((trait) => checked.has(trait.key)),
    };
  }

  /**
   * Lance, après avoir payé.
   *
   * Le paiement vient d'abord et conditionne le reste : une réserve qui a fondu
   * pendant qu'on réglait la boîte doit arrêter le jet, pas le laisser partir
   * avec des dés qu'on n'a pas payés. Ce bouton *est* la confirmation, et c'est
   * pourquoi le coût total est affiché juste au-dessus de lui.
   */
  private async _onRoll(html: JQuery) {
    const { index, mouvement, advantage, bonusDice, traits } =
      this.readForm(html);

    const paid: PlayedRiff[] = [];

    for (const entry of this.played) {
      if (entry.payments.length > 0 && !(await payOption(entry.payments, this.actor, entry.owed))) {
        ui.notifications?.warn(
          (game as any).i18n.format("COWBOY.riffs.cannotAfford", {
            cost: paymentOptionLabel(entry.payments),
            held: 0,
          })
        );
        return;
      }

      paid.push({ id: entry.id, name: entry.name, payment: entry.payment, payments: entry.payments });
    }

    // « Après avoir résolu le test, le CP efface les dommages des traits
    // décrits. » On les efface au lancer : un trait entamé ne donne pas de dé et
    // le groupement est déjà figé, donc l'écart avec la lettre du livre ne se
    // voit dans aucun chiffre - seule la fiction change d'ordre.
    const dented = this.actor.dentedTraits();
    const healed = this.damageRemovalForbidden(advantage)
      ? []
      : this.played.flatMap((entry) => entry.heal);
    for (const key of healed) {
      const trait = dented.find((candidate) => candidate.key === key);
      if (trait) await this.actor.damagePoolTrait(trait, false, false);
    }

    const storedPlan = Math.trunc(Number((this.actor as any).system?.plannedDie ?? 0));
    const usePlan = html.find(".cowboy-dialog-planned-die").is(":checked") && storedPlan >= 1 && storedPlan <= 6;
    if (usePlan) await this.actor.update({ "system.plannedDie": 0 });

    const assist = this.assistOf();
    const assistant = assist ? (game as any).actors?.get(assist.actorId) : undefined;
    const canReservePlan = hasLongTermPlan(this.actor) ||
      (assist?.riffId === "jam" && hasLongTermPlan(assistant));

    await this.actor.roll(
      this.genre,
      this.category,
      index,
      mouvement,
      advantage,
      bonusDice,
      traits,
      paid,
      assist,
      // Gelés sur la carte : l'assistant peut changer de groove après coup, et
      // la carte ne doit pas se mettre à raconter un autre test.
      this.grooveCards(),
      this.runningActivations(),
      this.applicableActivations(advantage),
      bespokeRulesOf(getActivePrime()),
      canReservePlan,
      usePlan ? storedPlan : undefined
    );
  }

  /** L'assistance déclarée, s'il y en a une. Enregistrée, jamais débitée. */
  private assistOf(): Assist | undefined {
    const entry = this.played.find(
      (candidate) => candidate.owed && candidate.assistId
    );
    if (!entry?.assistId) return undefined;

    return {
      actorId: entry.assistId,
      name: this.hunterName(entry.assistId),
      riffId: entry.id,
      payment: entry.payment,
      payments: entry.payments,
    };
  }
}

/** Un écart se lit signé, « +0 » compris. */
function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
