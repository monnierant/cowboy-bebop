# 0004 — Le MONO est un acteur, pas un objet

**Status:** accepted

## Context

Le MONO est le vaisseau personnel d'un chasseur. Le livre le pose comme trois
hexagones dessinés **sur la fiche de personnage**, à l'écart des autres : son
nom, qui compte pour le premier trait, plus deux traits libres.

Tout, dans sa description, dit « équipement » : il ne lance jamais de dés — c'est
le pilote qui jette, avec son genre à lui — il n'a ni rythme, ni cartouches, ni
genre, ni cartons, et sa possession est celle de son pilote. Une première
version du système en avait d'ailleurs fait un type d'Item, jamais terminé.

S'ajoute un argument de conception : ses traits sont endommagés *avant* ceux du
chasseur. Un Item embarqué rend ce couplage gratuit — `actor.items` — là où deux
acteurs distincts obligent à tenir une référence.

## Decision

Le MONO est un type d'**Actor**. Le chasseur qui le pilote garde son `uuid` dans
`system.mono`, rempli en déposant l'appareil sur sa fiche. Une prime porte le
même champ, sans mécanique.

## Considered Options

**Item embarqué** — le type `mono` qui existait déjà. Écarté pour une seule
raison, mais elle est structurelle : dans Foundry, seuls les Actors ont des
Tokens. Un Item ne se pose pas sur une scène, et la table veut voir les
vaisseaux se poursuivre sur une carte.

**Bloc de champs sur le chasseur** — ce que suggérait le champ mort
`system.ship`. Garantit un MONO par personnage, mais interdit pion, compendium
de modèles, et vaisseau de prime.

## Consequences

- Un chasseur peut se retrouver avec zéro ou deux MONO liés : le « un seul par
  personnage » du livre est une convention, pas une garantie du modèle. Le champ
  est simple et non une liste, donc un second dépôt remplace le premier.
- Le nom du MONO est le premier des trois hexagones et s'use comme les autres,
  mais il reste `actor.name` : c'est l'étiquette du pion. Seul son état de dégât
  vit à part, dans `system.nameState`. Les fonctions de `mono.ts` recollent les
  deux pour que le reste du système voie bien trois traits.
- Endommager un trait depuis la carte de chat traverse maintenant deux
  documents. C'est ce qui a obligé les boutons à porter l'adresse complète du
  trait au lieu de son seul nom (voir [ADR 0006](./0006-les-traits-de-mono-nont-pas-de-genre.md)).
- Le type d'Item `mono`, sa feuille et ses clefs de langue sont supprimés sans
  migration : sa feuille affichait un `TEST` en dur et un libellé non traduit,
  donc aucune table n'en avait jamais créé.
- La remise à neuf d'un MONO est un bouton distinct de celle de son pilote. Big
  Shot peut réparer le vaisseau sans effacer les cicatrices du chasseur.
