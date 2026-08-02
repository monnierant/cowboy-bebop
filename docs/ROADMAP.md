# What is left to do

## Blocking, before this is playable again

### Vérifier les riffs à une table

Rien de ce qui suit n'a tourné dans Foundry — seulement compilé, et le pack a
été relu depuis sa base pour prouver qu'il se recharge. Sur un monde Cowboy
Bebop :

- Ouvrir le compendium « Types de session » : quatre entrées, chacune avec ses
  trois mouvements et sa mise en place.
- Sur une prime neuve, la section Riffs est vide et la fiche des chasseurs
  annonce qu'aucun riff n'est sur la table.
- Appliquer un type par le bouton, puis par glisser-déposer depuis le
  compendium. Vérifier que la mise en place s'affiche après l'application.
- Réappliquer un type sur une prime déjà garnie : la confirmation doit
  apparaître, et refuser doit ne rien écrire.
- Cocher, décocher, ajouter et supprimer un riff libre, des deux côtés
  (chasseurs et Big Shot).
- Rendre la prime active, ouvrir une fiche de chasseur : elle montre les riffs
  du mouvement en cours, du côté des chasseurs seulement.
- Changer le mouvement de la prime pendant qu'une fiche de chasseur est
  ouverte : elle doit se recomposer sans qu'on la ferme. Idem en changeant de
  prime active.
- Vérifier qu'un joueur ne voit pas les options de Big Shot sur sa fiche.

### La clef `COWBOY.health` n'existe pas

`item-sheet-mono.hbs` demande `COWBOY.health` comme placeholder, et aucune des
deux langues ne la définit — Foundry affiche donc la clef brute. Préexistant à
la feature des riffs, repéré en vérifiant les traductions.

### Verify the dials at a table

Nothing below matters until this is done. On a Cowboy Bebop world with Sliced
Dials enabled:

- Create a prime, add an objective dial and a threat dial from its sheet.
- Check the dials appear on the sheet and in the module's panel.
- Make that prime active, roll from a hunter, then collect from the active GM's
  chat card. Check cartons land on the hunter, false notes on the prime, and the
  card turns into its settled account - who received what - with the collect
  button gone for everyone so it cannot be collected twice.
- On both an objective and a threat, check the GM can choose between a positive
  carton from a hunter and a negative false note from the prime. Check each
  selected pool drops by one.
- Empty a pool and check the genre is greyed out with a reason rather than
  failing after the click.
- Fill a dial and check it locks and announces its composition in chat.
- Check a player who is not an owner of the dial cannot place anything, and a
  player can spend only cartons belonging to a hunter they own.
- Correct cartons from a hunter sheet and check their named row appears on the
  prime sheet while its aggregate totals update by genre.
- Add a carton to the prime's bonus reserve, spend it on a linked dial as GM,
  and check players are not offered that reserve.
- Activate another prime and check the combat tracker shows only that prime's
  active dials, never prepared, hidden, unlinked or previous-prime dials.
- Link an existing world dial to the prime, then unlink it again.

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

### Le genre d'une prime est toujours renseigné

`template.json` donne `"genre": "rock"` à toute prime neuve, et
[`cowboybebopRoll.ts:27`](../src/ts/apps/rolls/cowboybebopRoll.ts) ajoute un dé
quand l'approche du chasseur égale ce genre. Une prime dont personne n'a choisi
le genre offre donc un dé gratuit aux jets de rock — et le livre dit qu'une
session filler n'a pas de genre du tout.

Le correctif est un genre « aucun » : une option vide dans la liste déroulante,
et pas de bonus quand elle est choisie. Écarté du lot « riffs » à dessein : Big
Shot ajuste à la main en attendant.

### Dead vocabulary

`isImportant` and `mouvement` were dropped from dials. If either mattered at the
table, decide whether it comes back as a category, a dial name convention, or
not at all.

## Housekeeping

- The work is on `feat/sliced-dials`; merge once the table check above passes.
- `package.json` is still named `foundry-module-ts` and described as a template.
- The repo predates the dual-mode build template; consider rebasing onto it for
  the release pipeline the other systems now have.
