# 0007 — Un test vit sur sa carte

**Status:** accepted

## Contexte

Un test produisait un objet `CowboyBebopRoll`, poussé dans un tableau `_rolls`
porté par l'acteur, et les boutons de la carte de chat désignaient leur test par
son rang dans ce tableau.

Or `CONFIG.Actor.documentClass` donne à chaque client sa propre instance de
chaque acteur, donc son propre `_rolls`. Seul le client qui avait ouvert la boîte
de dialogue y avait poussé quoi que ce soit. Chez tous les autres — Big Shot
compris — `_rolls[rollId]` valait `undefined` : les boutons de correction
s'affichaient pour tout le monde et ne faisaient rien pour personne d'autre que
le lanceur. Un rechargement de page suffisait d'ailleurs à les tuer pour lui
aussi.

Trois mécanismes de mise à jour cohabitaient. `collect` lisait son état dans les
attributs `data-*` de la carte et éditait le message partagé sur place. Les
corrections lisaient `_rolls` et effaçaient puis republiaient le message. Et
toutes appelaient une suppression du DOM local, visible du seul cliqueur.

## Décision

- L'état d'un test — score, corrections faites, état de chaque trait, jet en
  cours — vit dans un flag `cowboy-bebop.test` sur le `ChatMessage`. C'est la
  seule source de vérité, et elle survit à un rechargement.
- `CowboyBebopRoll` et `_rolls` disparaissent. L'état est une donnée, les actions
  sont des transitions pures dans `src/ts/rolls/testState.ts`, et
  `test/state.mjs` les tient ligne à ligne du livre.
- Peuvent agir sur une carte : son auteur, et tout MJ. C'est exactement la
  permission `OWNER` que Foundry applique déjà au message — `getUserLevel` ne
  donne `OWNER` qu'à l'auteur, les MJ passant par leur rôle. Aligner le droit de
  cliquer sur le droit d'écrire évite tout relais par socket.
- Quand Big Shot lance pour un chasseur, la carte est créée **au nom du joueur
  dont c'est le personnage** (`user.character`), à défaut de l'unique
  propriétaire non-MJ, à défaut de Big Shot lui-même. Sans quoi ce joueur ne
  pourrait rien corriger sur son propre test. Foundry le réserve aux MJ
  (`ChatMessage.#canCreate` s'ouvre sur `user.isGM`), donc un joueur signe
  toujours de son propre nom.
- La carte est toujours modifiée **sur place**, jamais effacée et republiée : une
  republication changerait l'auteur du message, donc son propriétaire, et Big
  Shot corrigeant la carte d'un joueur lui volerait sa propre carte.
- Chaque geste relit le flag sur le message plutôt que le HTML rendu, et
  désactive son bouton le temps de l'écriture.
- Un spectateur voit les corrections, désactivées avec leur motif. Seule la
  collecte reste retirée aux non-MJ : elle écrit sur la prime.
- **Tout** MJ agit, pas seulement `users.activeGM`. Cette élection sert à confier
  une tâche automatique à exactement un client - ce qu'une migration doit faire,
  et `migrateDialSignConvention` s'en sert toujours. Un bouton est un clic
  délibéré : un second MJ connecté devant une carte muette n'aurait rien pour
  comprendre pourquoi. Ceci révise l'ADR 0002, qui réservait la collecte au MJ
  actif.

## Conséquences

- Une carte d'un ancien log ne porte pas de flag. Elle perd ses boutons : elle ne
  pouvait de toute façon rien faire.
- Le flag stocke les traits complets tels qu'ils ont été mis sur la table, pas
  leurs seules clefs. Renommer un trait ne réécrit pas l'histoire d'un test
  passé.
- Deux clics vraiment simultanés restent une course, non fermée. C'est la même
  que l'ADR 0002 assume pour la dépense d'un dernier jeton : la fermer
  demanderait de sérialiser par un client élu, ce qui casserait dès qu'il se
  déconnecte. La relecture du flag ferme les cas réels — le double-clic et la
  carte périmée.
- La relance de Quitte ou double réécrit `message.rolls`, donc les modules de dés
  3D n'animeront pas un pari : ils s'accrochent à la création d'un message, pas à
  sa modification. Le prix d'une carte qui garde sa place dans la conversation.
- Un test dont l'acteur a été supprimé se rend encore : la carte porte son propre
  état, et ne lit la fiche que pour le compte de cartouches.
