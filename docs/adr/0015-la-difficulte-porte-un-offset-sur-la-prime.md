# 0015 — La difficulté porte un offset sur la prime

**Status:** accepted

Complète l'[ADR 0011](./0011-les-grooves-portent-des-regles-de-calcul.md) et
l'[ADR 0012](./0012-riffs-et-grooves-partagent-un-moteur-d-activations.md).

## Contexte

Le livre donne deux destinations aux cartons : avancer un cadran, ou **réduire de
1 la difficulté du mouvement pour les prochains tests de la session**. Seule la
première existait. La difficulté était lue dans la constante `mouvements` et rien
ne pouvait la déplacer.

Trois règles du catalogue s'appuient pourtant sur cette seconde destination.
*Vue du dernier étage* l'interdit, sauf Solo ! ; *Passe-partout* monte la
difficulté de 3 et laisse la racheter ; une fausse note dépensée par Big Shot la
monte de 1. L'[ADR 0012](./0012-riffs-et-grooves-partagent-un-moteur-d-activations.md)
avait déjà acté `cartonAgainstDifficulty` comme cible d'interdiction légitime —
la primitive interdite était déclarée, l'action qu'elle interdit ne l'a jamais
été. *Vue du dernier étage* n'avait donc aucun effet en jeu, et la moitié de
*Passe-partout* était ignorée.

Ce n'est pas une exception de Groove au sens de l'[ADR 0014](./0014-les-exceptions-nommees-restent-des-exceptions.md) :
c'est une règle générale de l'économie, que des Grooves modulent.

## Décision

**La prime porte un offset de difficulté.** Un entier signé unique,
`system.difficultyOffset`, appliqué au mouvement courant quel qu'il soit. La
difficulté d'un test vaut `max(1, mouvement.difficulty + offset)`.

**La borne porte sur la lecture, pas sur le compteur.** L'offset descend et monte
librement ; seule la difficulté effective est plancherée à 1. Un offset très bas
absorbe donc les hausses au lieu de les subir immédiatement, et aucune fiche n'a
à montrer une difficulté nulle ou négative.

**Un seul offset, pas un par mouvement.** Un « remettre à zéro » — ce que fait le
rachat de *Passe-partout* — n'a de sens que sur un compteur unique. Conséquence
assumée : ce qui est acheté au premier mouvement suit au dernier.

**Ce qui est dépensé sort du résultat du test.** « Après avoir effectué un test,
le CP peut dépenser ses cartons » désigne ceux que ce test vient de produire, et
non un jeton déjà rangé sur une fiche. Un carton dépensé contre le seuil n'avance
donc aucun cadran, une fausse note dépensée par Big Shot ne rejoint pas la prime,
et le genre ne se pose pas — la difficulté d'un mouvement n'en a pas, et le
résultat d'une Carte non plus.

**Les gestes vivent dans la boîte de collecte, pas sur la Carte.** Un chasseur
dépense un carton pour −1, Big Shot une fausse note pour +1, *Passe-partout* se
rachète à deux cartons : trois gestes qui puisent dans la même poignée de jetons,
donc un seul endroit et un seul moment. Ce moment est la collecte, parce que c'est
le seul où les jetons sont stables — jusque-là, chaque relance et chaque réécriture
recalcule le score depuis les dés, et un jeton dépensé plus tôt serait rendu au
premier Quitte ou double alors que l'Offset, lui, aurait bougé.

Conséquence : rien n'est écrit avant la validation de la boîte. Elle montre un
plan — ce qui reste à créditer, l'écart avant → après — et un bouton par geste qui
entame la collecte ; fermer la boîte ne laisse aucune trace, ce qui tient lieu
d'annulation. Les deux dépenses y sont toujours offertes, grisées avec leur motif
quand elles ne peuvent pas être jouées : ce sont des règles générales de
l'économie. Le rachat, lui, n'apparaît que sous *Passe-partout* — l'afficher
grisé ferait croire à une règle que la table n'a pas. La Carte, elle, ne porte plus que le rappel de l'écart courant. Le
geste reste consigné publiquement (ADR 0007) : le résultat de la répartition est
écrit dans le bandeau de collecte, sur la Carte que toute la table relit.

**Passe-partout est un marché offert à chaque test.** Une case dans la boîte de
jet monte l'offset de 3 — le test en cours compris — et ajoute un dé. Elle est
cochable à chaque jet et sa hausse s'empile ; c'est précisément ce qui rend le
rachat à deux cartons intéressant. Ce rachat remet l'offset à zéro, y compris la
part que les chasseurs avaient achetée.

**Le rachat est à ce Groove ce que les dépenses sont à l'économie.** Il ne vit
que là où *Passe-partout* est en jeu : c'est son mécanisme spécial, pas une
seconde destination des cartons. La boîte de collecte lit donc `masterKey` dans
les exceptions gelées avec le Test (ADR 0014) pour décider d'offrir le geste —
gelé, si bien qu'une prime qui change de Groove entre le lancer et la collecte
n'ouvre ni ne ferme un rachat après coup.

**Passe-partout rejoint donc les exceptions nommées de l'ADR 0014**, et cesse de
porter des Activations. Sa case est un *choix* et son écart une *mémoire* : les
deux critères qui, par cet ADR, tiennent une règle hors du vocabulaire fermé. Le
catalogue compte désormais treize Grooves à Activation et sept exceptions
nommées.

**L'exception Solo ! est un droit, pas une provenance.** *Vue du dernier étage*
éteint le bouton carton de la boîte de collecte. Jouer son Solo ! — qui vit hors de tout test — crédite
un droit unique de réduction, consommé au premier usage et perdu au solde de
session. Le droit autorise la dépense ; il ne la paie pas.

Le solde de session remet l'offset à zéro, comme les cartons, les fausses notes,
le mouvement et le résultat réservé.

## Considérées et écartées

- **Un offset par mouvement.** Évitait qu'un +3 pris au premier mouvement pèse
  encore au dernier, mais rendait le « remettre à zéro » ambigu et l'affichage
  plus lourd.
- **Un réglage libre sur la fiche de prime.** Plus souple pour Big Shot et
  cohérent avec les états nommés de l'ADR 0014, mais l'opération devenait
  invisible à la table.
- **Un rachat propre à Passe-partout, sans règle générale.** Refusé par
  l'ADR 0012 : un geste à client unique, alors que le livre donne bien une règle
  générale.
- **Borner l'offset lui-même.** Un plafond neutraliserait silencieusement un
  Groove de prime ; aucune ligne de règle ne le mentionne.
- **Les gestes sur la Carte, en dépensant tout de suite.** L'endroit paraissait
  juste — la règle dit « après avoir effectué un test » — mais le score y est
  recalculé depuis les dés à chaque relance : le jeton dépensé revenait, et
  l'écart restait déplacé.
- **Une dette portée par le Test, débitée à la collecte.** Réparait ce défaut
  sans déplacer les boutons, mais dédoublait le compte des jetons (`score` et ce
  qu'il en reste) dans tout ce qui les lit : correction, riffs, affichage.

## Conséquences

- Le modèle ajoute `system.difficultyOffset` à la prime et un droit de réduction
  au chasseur, tous deux soldés en fin de session.
- `cartonAgainstDifficulty` cesse d'être une déclaration morte. *Vue du dernier
  étage* devient joué ; *Passe-partout* l'est entièrement.
- Un **Mouvement ne fixe plus seul la difficulté** — le glossaire le disait, il
  est corrigé.
- Les fausses notes gagnent une destination de dépense, les cartons une seconde.
  Les deux entrent en concurrence avec les cadrans.
- La difficulté cesse d'être une fonction pure du mouvement : toute Carte doit la
  figer à son instantané, sous peine qu'un achat postérieur réécrive un test déjà
  lancé (ADR 0007).
- Collecter cesse d'être un clic pour devenir un arbitrage : le bouton ouvre une
  boîte (`rolls/collectPlan.ts` pour la règle, `apps/rolls/collectDialog.ts` pour
  l'écran), et le bandeau de collecte annonce l'écart déplacé en plus de ce qui a
  été crédité.
