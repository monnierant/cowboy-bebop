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
La cible d'une chasse. Porte un groove, et un secret par approche. Une seule est
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
difficultés, et trois riffs la dépensent. Portée par la prime en jeu ; seul Big
Shot la dépense. Deux de ces riffs la débitent quand il les joue ; le
troisième, qui désavantage un jet à venir, ne le fait pas — voir Assistance.

**Poursuite** :
Le moment où l'on prend un vaisseau en chasse. C'est là que les traits d'un
MONO passent avant ceux de son pilote, et son terme quand ils sont tous
entamés. Non modélisée à ce jour : rien ne l'ouvre ni ne la ferme, seul le
moment où un MONO tombe est signalé.

### Ce qu'on joue

**Test** :
Ce qu'un chasseur lance quand il veut affecter la fiction : une approche, un
groupement de dés, des cartons et des fausses notes, puis des corrections. Il
appartient au chasseur qui l'a lancé, qui le corrige avec Big Shot et personne
d'autre, et il dure jusqu'à sa collecte.
_Avoid_: jet, roll, lancer

**Carte** :
Ce sur quoi un test vit, du moment où les dés tombent à celui où ses jetons
partent. C'est là que les traits se dépensent, que les paris se jouent et que la
collecte se signe.

**Historique du Test** :
La suite immuable des résultats et transformations conservée sur une même Carte.
Les étapes précédentes restent visibles et barrées ; seule la dernière est
courante et collectable.
_Avoid_: remplacement du Roll, nouvelle carte, résultat écrasé

**Riff** :
Une action de gameplay qu'un chasseur peut jouer pendant un test. Le livre en
définit huit ; un type de session dit lesquelles sont ouvertes à chaque
mouvement, et à quel prix. Se joue autant de fois que ce prix peut être payé.
_Avoid_: action, capacité, pouvoir, move

**Paiement** :
Ce qu'une Activation coûte : un choix entre plusieurs options, chacune formée
d'une ou plusieurs dépenses appliquées ensemble ou pas du tout. Une option vide
est gratuite ; plusieurs options expriment une alternative comme cartouche ou
rythme.
_Avoid_: coût, prix, ressource

**Groove** :
Une capacité nommée qui enfreint une règle de base. Un chasseur en porte un, une
prime en porte un, et on n'en change qu'au pivot de saison. Se possède et ne se
joue pas : c'est ce qui le sépare d'un riff, qu'une session ouvre et qu'on paie.
Il porte trois choses et seulement trois — ses Activations, sa Substitution, ses
Rappels. Sur les trente-trois du livre, quatorze portent une Activation, cinq une
Substitution, onze un Rappel ; un seul en porte une Activation et un Rappel.
Six règles à geste ou mémoire propre restent des exceptions nommées (ADR 0014),
dont deux conservent aussi un Rappel pour leur moitié manuelle.
_Avoid_: capacité, pouvoir, talent, don

**Effet** :
Ce qu'une Activation change. Sa nature impose son moment d'application, sa place
dans la résolution des règles, et le fait qu'il porte ou non un montant. Un Effet
ne nomme jamais un genre.
_Avoid_: conséquence, moment libre, callback, effet spécial, règle de calcul

**Activation** :
L'unité atomique qui réunit des Conditions, les Paiements acceptés, un ou
plusieurs Effets et sa durée éventuelle. Elle applique tout son contenu ou rien.
Sans durée elle est instantanée ; avec une durée elle persiste, et celle qui court
sur la prime est une Activation en cours, gelée avec le nom du Groove qui l'a
posée. C'est ce que le système **applique**, par opposition au Rappel, qu'il dit
seulement, et à la Substitution, qui ouvre des traits avant qu'aucune Activation
ne parle.
_Avoid_: bouton, déclencheur, règle isolée, modulation, mécanique

**Rappel de Groove** :
Une instruction adressée à la table lorsqu'un Groove dépend d'un cadran ou d'un
fait que le système ne pilote pas. Le système la présente au moment utile et
n'applique jamais ce qu'elle décrit : c'est ce qui la sépare d'une Activation. Sa
visibilité est explicitement limitée à Big Shot ou ouverte à toute la table ; par
défaut, elle suit le public du Groove — privée pour une prime, publique pour un
chasseur.
_Avoid_: effet de cadran, automatisation Sliced Dials

**État de Groove nommé** :
Le choix ou fait minimal porté par une prime pour l'une des exceptions de
l'ADR 0014 — otages en sécurité, chasseur lié, chasseurs désignés, secret
accepté. Big Shot le règle sur la prime active ; une Carte en fige seulement ce
qui peut encore agir sur elle. Ce n'est ni une Activation ni une mémoire
générique.
_Avoid_: moteur d'état, effet configurable, pilotage de cadran

**Résolution des règles** :
L'ordre commun dans lequel les effets simultanés s'appliquent : interdire
ou annuler, remplacer, ajouter ou retirer, puis imposer un minimum ou un maximum.
_Avoid_: priorité, ordre du Groove, ordre de saisie

**Condition** :
Une comparaison portant sur un fait du test ou de la session. Toutes les
conditions d'une même Activation doivent être vraies ; une alternative s'écrit
comme une autre Activation. Une Condition ne nomme jamais un genre : elle le
compare à celui de la session.
_Avoid_: groupe logique, expression, filtre, condition de groove

**Fait de jeu** :
Une donnée nommée et stable qu'une Condition peut observer, comme le désavantage,
les faces actives, les cartons, la difficulté ou le mouvement. Ce n'est jamais
un emplacement de stockage dans une fiche Foundry.
_Avoid_: champ, chemin de données, propriété système

**Substitution** :
Ce qu'un groove ouvre : les traits d'une approche mis à disposition d'une ou deux
autres. Cinq grooves du livre n'ont pas d'autre effet. Automatique — le livre dit
« utiliser systématiquement » — donc jamais payée, jamais conditionnelle, jamais
éteinte. C'est le seul endroit du système qui nomme un genre, et c'est ce qui la
tient hors des Activations. Ne donne jamais le dé de genre : ce sont les traits
qui changent d'approche, pas le test.
_Avoid_: effet, activation, modulation

**Expiration** :
Les événements qui peuvent éteindre une Activation persistante : fin du test,
changement de mouvement, fin de session ou révélation du secret. Le premier qui
survient l'éteint ; revenir à un ancien mouvement ne la rétablit pas.
_Avoid_: portée, durée libre, horloge secondaire

**Réactivation** :
Ce qu'une Activation persistante déjà en cours fait d'une seconde tentative :
elle la bloque. Rejouer un Groove dont l'Activation court grise son bouton avec
son motif, et rien n'est payé. Une Activation instantanée est répétable.
_Avoid_: doublon, priorité, clic répété, cumul, rafraîchissement

**Assistance** :
Le fait qu'un chasseur en aide un autre pendant son test. Enregistrée sur le
test, qui nomme l'assistant et rappelle ce qu'il doit ; jamais débitée. Le
système n'écrit sur la fiche de personne d'autre que celle qu'on joue, et le
Risque suit la même règle. Jam ! prête en plus le groove de l'assistant : c'est
la règle qui passe, pas le matériel — elle s'applique aux traits de celui qui
lance.

**Type de session** :
La forme d'une partie. Le livre en donne quatre — classique, personnelle,
filler, pivot de saison — dont chacun fixe la mise en place, la suite de
mouvements jouée, les riffs ouverts à chacun et ce qu'ils y coûtent. Le prix
d'une correction en fait partie, bien que corriger ne soit pas un riff : c'est
la seule chose qu'une session filler change et qu'aucun riff ne porte. Existe
comme document
réutilisable ; ce qui est joué en copie le contenu plutôt que d'y rester lié.
_Avoid_: jeu de riffs, répertoire, setlist, preset, modèle

**Mouvement** :
L'un des trois actes nommés — OK, 3-2-1…, Let's jam ! — qui fixe le nombre de
dés, les fausses notes et la difficulté **de base** d'un test ; l'Offset de
difficulté s'y ajoute. Une identité, pas un rang : un type de session en joue un,
trois, ou trois à l'envers.
_Avoid_: rang, acte, phase

**Structure** :
La suite de mouvements qu'un type de session fait jouer. Classique : OK, puis
3-2-1…, puis Let's jam !. Inversée : la même à l'envers. Libre : un seul
mouvement, du début à la fin.

### L'économie

**Carton** :
Un succès marqué, d'un genre donné. Reste chez le chasseur qui l'a gagné
jusqu'à sa dépense (voir ADR 0002). Deux destinations, arbitrées dans la boîte de
collecte : une tranche de cadran, ou l'Offset de difficulté.

**Fausse note** :
Un revers, d'un genre donné. S'accumule sur la prime active. Big Shot peut aussi
la dépenser contre l'Offset de difficulté, dans la boîte de collecte, plutôt que
de l'encaisser ; ou en rayer une sur la carte, gratuitement et sans limite — ce
qui n'est ni une correction — le plafond de deux borne ce qu'un chasseur rachète —
ni un riff, donc aucun type de session ne l'ouvre ni ne la ferme.

**Boîte de collecte** :
Le dialogue qui répartit ce qu'un test a produit, au moment de solder la carte :
un bouton par geste qui entame la collecte — dépenser un carton, dépenser une
fausse note, racheter le seuil — et rien d'écrit tant qu'elle n'est pas validée
(voir ADR 0015).
_Avoid_: fenêtre de dépense, popup de jetons
_Avoid_: échec, malus

**Offset de difficulté** :
L'écart, porté par la prime, entre la difficulté de base du mouvement et celle
qu'un test affronte réellement. Un seul, signé, valable pour toute la session ;
un chasseur le baisse d'un carton, Big Shot le monte d'une fausse note, un Groove
de prime peut le déplacer. La difficulté lue ne descend jamais sous 1, mais
l'offset lui-même n'est pas borné (voir ADR 0015).
_Avoid_: modificateur, malus de seuil, difficulté courante

**Rythme** :
La réserve d'un chasseur qui paie les riffs les plus chers.

**Cartouche** :
Ce qu'un chasseur coche pour s'impliquer et ajouter des dés.

**Genre** :
Rock, blues, jazz, dance ou tango. Colore à la fois les traits d'un chasseur,
les jetons de l'économie et la prime elle-même.

**Trait** :
Une phrase qui ajoute un dé tant qu'elle n'est ni entamée ni brisée. Celles
d'un chasseur sont rangées sous un genre et ne servent qu'aux jets de ce
genre ; celles d'un MONO n'en ont aucun et servent partout.

**Entamé**, **brisé** :
Les deux degrés d'usure d'un trait. Un trait entamé ne donne plus de dé et se
répare ; un trait brisé ne se répare plus. Seule la remise à neuf de Big Shot
rend les deux.
_Avoid_: endommagé, damaged, sévèrement endommagé, hyperdamaged

### Les vaisseaux

**MONO** :
Le vaisseau d'un chasseur. Trois traits, dont son nom ; ils encaissent avant
ceux de son pilote, et quand ils sont tous entamés il est hors course. Une
prime peut en avoir un, sans mécanique.
_Avoid_: vaisseau, zipcraft, engin, monture

**Vaisseau mère** :
Le vaisseau de l'équipage. Un nom, trois descripteurs — style, caractéristique
externe, caractéristique interne — dont deux thèmes et un ton. Ne donne aucun
dé et ne s'endommage pas : c'est une boussole de campagne.
_Avoid_: vaisseau, NVM, cargo
