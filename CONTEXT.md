# Cowboy Bebop

Le système Foundry du jeu de rôle Cowboy Bebop : des chasseurs de primes
traquent une prime, une session à la fois, en dépensant une économie de jetons
musicaux. Les cadrans sont délégués au module Sliced Dials (voir ADR 0001).

## Language

### La table

**Chasseur** :
Un personnage joué, abrégé CP dans le livre. Porte ses traits, son rythme, ses
cartouches, ses fardeaux et les cartons qu'il a gagnés.
_Avoid_: PJ, joueur, personnage

**Big Shot** :
Celui qui mène la partie. Choisit la prime, tient les risques, arbitre les
mouvements.
_Avoid_: MJ, GM, meneur

**Prime** :
La cible d'une chasse. Porte un groove et un secret par approche. Une seule est
active à la fois, désignée par un réglage de monde. Une session filler n'en a
pas.
_Avoid_: cible, NPC, ennemi

**Session** :
Une partie, d'une mise en place à un dénouement. C'est la prime active qui la
porte : ses traits de session, son secret, son mouvement en cours, ses riffs.
Une session filler se joue donc avec une prime qui ne désigne aucune cible.

**Fardeau** :
Une part du passé d'un chasseur, notée sur sa fiche. Trois au maximum ; marqués
d'un X, ils décident du sort du personnage à la fin de la campagne.

**Risque** :
La réserve de Big Shot, gagnée à la mise en place. Sert à durcir les
difficultés. Non modélisé à ce jour.

### Ce qu'on joue

**Riff** :
Une action de gameplay qu'un chasseur peut jouer pendant un test. Le livre en
définit huit ; un type de session dit lesquelles sont ouvertes à chaque
mouvement.
_Avoid_: action, capacité, pouvoir, move

**Type de session** :
La forme d'une partie. Le livre en donne quatre — classique, personnelle,
filler, pivot de saison — dont chacun fixe la mise en place, la suite de
mouvements jouée et les riffs ouverts à chacun. Existe comme document
réutilisable ; ce qui est joué en copie le contenu plutôt que d'y rester lié.
_Avoid_: jeu de riffs, répertoire, setlist, preset, modèle

**Mouvement** :
L'un des trois actes nommés — OK, 3-2-1…, Let's jam ! — qui fixe la difficulté,
le nombre de dés et de fausses notes d'un test. Une identité, pas un rang : un
type de session en joue un, trois, ou trois à l'envers.
_Avoid_: rang, acte, phase

**Structure** :
La suite de mouvements qu'un type de session fait jouer. Classique : OK, puis
3-2-1…, puis Let's jam !. Inversée : la même à l'envers. Libre : un seul
mouvement, du début à la fin.

### L'économie

**Carton** :
Un succès marqué, d'un genre donné. Reste chez le chasseur qui l'a gagné
jusqu'à sa dépense (voir ADR 0002).

**Fausse note** :
Un revers, d'un genre donné. S'accumule sur la prime active.
_Avoid_: échec, malus

**Rythme** :
La réserve d'un chasseur qui paie les riffs les plus chers.

**Cartouche** :
Ce qu'un chasseur coche pour s'impliquer et ajouter des dés.

**Genre** :
Rock, blues, jazz, dance ou tango. Colore à la fois les traits d'un chasseur,
les jetons de l'économie et la prime elle-même.

**Trait** :
Une phrase décrivant un chasseur, rangée sous un genre, qui ajoute un dé tant
qu'elle n'est ni entamée ni brisée.
