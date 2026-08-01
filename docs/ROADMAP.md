# What is left to do

## Blocking, before this is playable again

### Verify the dials at a table

Nothing below matters until this is done. On a Cowboy Bebop world with Sliced
Dials enabled:

- Create a prime, add an objective dial and a threat dial from its sheet.
- Check the dials appear on the sheet and in the module's panel.
- Place a slice of each genre; check the matching pool drops by one.
- Empty a pool and check the genre is greyed out with a reason rather than
  failing after the click.
- Fill a dial and check it locks and announces its composition in chat.
- Check a player who is not an owner of the dial cannot place anything.

### The toolchain is lying

`package.json` still pins `foundry-vtt-types@^9` and TypeScript 4.8, while the
manifest declares v13–v14. It compiles, and the API being called is the modern
one, but the types describe a Foundry that no longer exists — so they are
checking nothing useful and will hide real breakage.

Upgrade to `^13.341` and TypeScript 5.6, matching `not-the-end`. Expect a wall
of errors: the existing sheets, roll dialog and actor document were written
against v9 typings.

This was deliberately kept out of the dials work rather than riding along with
a feature.

## Known debt, in rough order of risk

### ApplicationV1 sheets

`ActorSheet` and `ItemSheet` are deprecated since v13 and will be removed. The
sheets need porting to `ApplicationV2`. Sliced Dials is already ApplicationV2
throughout, so `mountDials` works either way — this is not blocked by the module.

### template.json instead of DataModels

Foundry v14 still reads `template.json` (`game.model` documents it), so this is
not urgent. It is the direction every other system in this collection has taken,
and it buys real validation.

### The token economy still targets "the current prime"

A roll awards tokens and false notes to whichever prime carries
`isCurrentTarget`. That was built when dials lived on that same prime. Now that
dials are documents that can sit anywhere, this indirection is worth
re-examining — it may no longer be the simplest thing.

### Dead vocabulary

`isImportant` and `mouvement` were dropped from dials. If either mattered at the
table, decide whether it comes back as a category, a dial name convention, or
not at all.

## Housekeeping

- The work is on `feat/sliced-dials`; merge once the table check above passes.
- `package.json` is still named `foundry-module-ts` and described as a template.
- The repo predates the dual-mode build template; consider rebasing onto it for
  the release pipeline the other systems now have.
