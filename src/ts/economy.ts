import { genres } from "./constants";
import { primeOfDial } from "./prime";
import { expireActivations } from "./grooves";

// Who holds what, and who may spend it.
//
// The two currencies a roll produces are held by different people. Cartons are
// positive and stay with the hunter who produced them. A prime may also hold a
// small GM-managed carton reserve for tests and bonuses. False notes are
// negative and collect on the prime currently in play.
//
// That asymmetry is the whole reason a slice needs a payer at all: a `-` slice
// has exactly one possible source, a `+` slice has as many as there are hunters.

export type Sign = "+" | "-";

/** Where a slice of each sign is paid from. */
export const POOL_OF: Record<Sign, "cartons" | "notes"> = {
  "+": "cartons",
  "-": "notes",
};

export interface Payer {
  actor: any;
  /** How many tokens of the asked-for genre this payer holds. */
  held: number;
}

export function held(actor: any, sign: Sign, genre: string): number {
  return actor?.system?.[POOL_OF[sign]]?.[genre] ?? 0;
}

/**
 * Everyone who could pay for this slice, whether or not they can afford it.
 *
 * The ones who cannot are kept: the picker shows them greyed out, because "why
 * can't Spike pay for this" is a question the table actually asks, and an empty
 * dialog answers nothing.
 */
export function payersFor(dial: any, sign: Sign): any[] {
  const user = (game as any).user;

  if (sign === "-") {
    const prime = primeOfDial(dial);
    // Notes live on the prime. A player may own an individual dial without
    // owning that prime, but in that case Foundry would accept the slice and
    // reject the debit afterwards. Do not offer a payer this client cannot
    // actually write to; false notes are therefore GM-operated unless the
    // player has explicitly been made owner of the prime too.
    return prime?.testUserPermission(user, "OWNER") ? [prime] : [];
  }

  // Positive slices spend cartons. A player sees only the hunters they may
  // spend for. The GM sees them all and the linked prime's bonus reserve.
  const hunters = ((game as any).actors ?? [])
    .filter(
      (actor: any) => actor.type === "chasseur" && actor.testUserPermission(user, "OWNER")
    );
  const prime = primeOfDial(dial);
  const primeReserve =
    prime?.testUserPermission(user, "OWNER") ? [prime] : [];

  return [...hunters, ...primeReserve].sort((a: any, b: any) =>
    a.name.localeCompare(b.name)
  );
}

/** Can anyone at all pay for this? What the ruleset validator asks. */
export function anyoneCanPay(dial: any, sign: Sign, genre: string): boolean {
  return payersFor(dial, sign).some((actor: any) => held(actor, sign, genre) > 0);
}

/**
 * Takes one token off a payer.
 *
 * Called once the slice has landed. The picker already refused what could not be
 * afforded, so this cannot drive a pool negative - the clamp is there for the
 * case where two clients spent the last token at the same instant.
 */
export async function spend(
  actor: any,
  sign: Sign,
  genre: string
): Promise<void> {
  const pool = POOL_OF[sign];
  const current = actor?.system?.[pool]?.[genre];
  if (typeof current !== "number") return;

  await actor.update({
    [`system.${pool}.${genre}`]: Math.max(0, current - 1),
  });
}

/** The GM's correction, and the credit side of a roll. */
export async function adjust(
  actor: any,
  pool: "cartons" | "notes",
  genre: string,
  by: number
): Promise<void> {
  if (!actor || !genres.includes(genre)) return;
  const current = Number(actor.system?.[pool]?.[genre] ?? 0);

  await actor.update({
    [`system.${pool}.${genre}`]: Math.max(0, current + by),
  });

  if (pool === "cartons") {
    Object.values((ui as any).windows ?? {}).forEach((app: any) => {
      if (app?.actor?.type === "prime") app.render(false);
    });
  }
}

/** Les cinq genres à zéro, la forme qu'une réserve vide a toujours. */
const emptyPool = (): Record<string, number> =>
  Object.fromEntries(genres.map((genre) => [genre, 0]));

/**
 * Solde l'économie d'une session : plus un carton nulle part, plus une fausse
 * note, et la prime revient au premier mouvement.
 *
 * Les cartons de chaque chasseur sont compris. C'est délibéré, et c'est ce qui
 * rend ce geste large : un carton suit celui qui l'a gagné (ADR 0002), donc les
 * remettre à zéro depuis la prime écrit sur des documents qu'elle ne possède
 * pas. La fiche demande confirmation avant de l'appeler.
 *
 * Rend le nombre de chasseurs touchés, pour que l'appelant puisse le dire.
 */
export async function resetSession(prime: any): Promise<number> {
  if (!prime) return 0;

  await prime.update({
    "system.mouvement": 0,
    "system.cartons": emptyPool(),
    "system.notes": emptyPool(),
    "system.difficultyOffset": 0,
  });

  // Passer par l'expiration plutôt qu'écraser : `survives` rend toujours faux
  // pour l'événement `session`, donc rien ne court après, et les activations
  // invalides restent conservées pour réparation au lieu d'être perdues par ce
  // seul chemin.
  await expireActivations(prime, "session");

  const hunters = ((game as any).actors ?? []).filter(
    (actor: any) => actor.type === "chasseur"
  );

  for (const hunter of hunters) {
    // Le solo se rend en même temps que les jetons : « une fois par session »
    // n'a de sens que si quelque chose marque la fin d'une session, et c'est ce
    // geste-là. Rien d'autre dans le système ne le fait.
    await hunter.update({
      "system.cartons": emptyPool(),
      "system.solo": false,
      "system.plannedDie": 0,
      "system.difficultyRelief": false,
    });
  }

  // Les fiches de prime affichent les cartons des chasseurs : elles ne se
  // redessinent pas toutes seules quand c'est un autre acteur qui a changé.
  Object.values((ui as any).windows ?? {}).forEach((app: any) => {
    if (app?.actor?.type === "prime") app.render(false);
  });

  return hunters.length;
}

/**
 * What the prime sheet shows at the bottom: the table's total cartons by genre.
 * Individual ownership and corrections stay on each hunter sheet.
 */
export function cartonTotals(): Record<string, number> {
  const totals = Object.fromEntries(genres.map((genre) => [genre, 0]));

  ((game as any).actors ?? [])
    .filter((actor: any) => actor.type === "chasseur")
    .forEach((actor: any) => {
      genres.forEach((genre) => {
        totals[genre] += Number(actor.system?.cartons?.[genre] ?? 0);
      });
    });

  return totals;
}

/**
 * Breakdown shown on a prime: one row per hunter holding cartons.
 *
 * Empty-handed hunters are hidden by default - the players read this as a
 * scoreboard. The GM asks for them anyway: a row that isn't drawn has no
 * buttons, so a hunter at zero could never be credited from here.
 */
export function cartonHolders(includeEmpty: boolean = false): Array<{
  actorId: string;
  name: string;
  cartons: Record<string, number>;
}> {
  return ((game as any).actors ?? [])
    .filter((actor: any) => actor.type === "chasseur")
    .map((actor: any) => {
      const cartons = Object.fromEntries(
        genres.map((genre) => [
          genre,
          Number(actor.system?.cartons?.[genre] ?? 0),
        ])
      );

      return {
        actorId: actor.id,
        name: actor.name,
        cartons,
      };
    })
    .filter(
      (holder: any) =>
        includeEmpty ||
        Object.values(holder.cartons).some((value: any) => value > 0)
    )
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
}
