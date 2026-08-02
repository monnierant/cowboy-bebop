# 0001 — Dials are delegated to the Sliced Dials module

**Status:** accepted

## Context

Dials were an array in `system.cadrans` on the prime, drawn by hand with a CSS
`conic-gradient` and driven by index arithmetic. It worked, and it was going to
have to be written a second time for Ghost in the Shell.

## Decision

Dials become documents owned by the
[Sliced Dials](https://github.com/monnierant/sliced-dials) module, declared as a
hard dependency in the manifest. This system keeps only what is genuinely its
own: the genres, and the economy of tokens and false notes.

## Consequences

- The integration entry point lives in `src/ts/slicedDials.ts`: it registers the
  ruleset and arbitrates placement intents. The system-side economy and the
  link between world dials and primes live in their own modules; see ADR 0002.
- **This system no longer draws a dial.** The prime sheet hands a container to
  `api.mountDials` and stays out of it.
- Objective and threat are names, not payment constraints: both accept either
  sign. Cartons fill `+`; false notes fill `-`. Cartons normally belong to a
  hunter, but each prime also has a GM-managed reserve for tests and bonuses.
- The validator refuses a genre nobody can pay for. The system then asks both
  which genre and which actor pays, places the slice through the module API,
  and debits that actor once the placement has landed.
- The debit is not atomic with the placement. The validator has already refused
  what the pool could not pay for, so it cannot go negative. Accepted.
- `isImportant` and `mouvement` had no generic meaning and were dropped rather
  than carried into the module as flags.
- **Existing `system.cadrans` data is abandoned, not migrated.** GMs recreate
  their dials. A converter was considered and judged not worth its own bugs for
  a system this young.
- A world cannot load this system without the module: the manifest declares the
  dependency, and the sheet says so plainly if someone disables it anyway.
