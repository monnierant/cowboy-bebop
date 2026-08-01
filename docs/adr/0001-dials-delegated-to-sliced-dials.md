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

- Everything this system says to the module lives in `src/ts/slicedDials.ts`: a
  registered ruleset, a validator, and a debit. Nothing else in the codebase
  knows dials exist.
- **This system no longer draws a dial.** The prime sheet hands a container to
  `api.mountDials` and stays out of it.
- "Objective or threat" stops being a boolean and becomes *which sign the dial
  accepts* — the module's vocabulary. Tokens fill `+`, false notes fill `-`.
- The validator refuses a genre whose pool is empty, so the module greys the
  button out with a reason instead of failing after the click. The token is
  spent on `slicedDials.slicePlaced`, once the slice has landed.
- The debit is not atomic with the placement. The validator has already refused
  what the pool could not pay for, so it cannot go negative. Accepted.
- `isImportant` and `mouvement` had no generic meaning and were dropped rather
  than carried into the module as flags.
- **Existing `system.cadrans` data is abandoned, not migrated.** GMs recreate
  their dials. A converter was considered and judged not worth its own bugs for
  a system this young.
- A world cannot load this system without the module: the manifest declares the
  dependency, and the sheet says so plainly if someone disables it anyway.
