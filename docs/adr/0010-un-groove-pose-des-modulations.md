# 0010 — Un groove pose des modulations

**Status:** accepted, partiellement révisé par l'ADR 0012 et l'ADR 0013

L'[ADR 0012](./0012-riffs-et-grooves-partagent-un-moteur-d-activations.md) fond
`Modulation` dans l'Activation commune aux riffs et aux grooves. Le refus du « moteur
complet » écarté plus bas tient toujours dans sa substance — l'ADR 0012 n'ouvre pas les
vocabulaires et n'ajoute qu'une primitive, due à quatre entrées du livre. Le groove
Item, la portée, le filtre, la substitution et le partage Jam ! sont inchangés.

L'[ADR 0013](./0013-ce-qui-reste-hors-de-l-activation.md) retire le **mot** avec
l'objet : une Activation persistante qui court sur la prime est une *Activation en
cours*. Ne cherchez pas de `Modulation` dans le code, il n'y en a plus. Le même ADR
confirme en revanche la substitution comme un réglage propre du groove, hors Activation.

## Contexte

Un groove est une capacité nommée qui enfreint une règle de base. Le livre en
donne une trentaine : onze pour les chasseurs, le reste pour les primes. Jusqu'ici
le système n'en gardait qu'un champ texte libre, affiché sur la seule fiche de
prime, et l'[ADR 0009](./0009-ecrire-seulement-sur-la-fiche-quon-joue.md) actait
que « conférer son groove » (Jam !) n'était pas modélisé.

La ROADMAP justifiait ce renoncement par une phrase fausse : « le seul dé de
groove du système est le bonus de genre, qui se constate et ne se prête pas ».
Un groove n'est pas un dé. Le renoncement était fondé — rien n'était modélisé —
mais pour la mauvaise raison, et Assister et Jam ! restaient strictement
identiques faute de la trancher.

Deux constats ont ouvert la question.

**Côté chasseurs, une seule famille est uniforme.** Cinq grooves sur onze disent
la même phrase : « utiliser systématiquement les traits de X pour les tests de Y
ou Z ». C'est une donnée, et elle tombe sur une couture qui existe déjà —
`approaches()` dans la boîte de jet, qu'Improviser alimente. Les six autres
réclament chacun sa primitive : lire les faces des dés, en réécrire une, relancer
le dé écarté, un nombre de dés variable, une adjacence hexagonale que la fiche ne
modélise pas, un dé réservé d'un test à l'autre.

**Côté primes, neuf grooves ont la forme d'un riff de Big Shot, à une chose
près.** « En dépensant un risque, jusqu'à la fin du mouvement, les tests de
l'approche du genre de session se font avec désavantage » : un paiement, un
effet, et une **durée**. Le riff `risqueDisadvantage` pose exactement ce
désavantage, mais sur un test.

## Décision

**Un groove est un Item possédé, et ce qu'il pose s'appelle une modulation.**

Un groove porte les mêmes paiements et les mêmes effets qu'un riff — le
vocabulaire fermé de l'[ADR 0008](./0008-un-riff-porte-son-prix-et-ses-effets.md),
inchangé — plus trois choses qui lui sont propres :

- une **substitution**, qui ouvre les traits d'une approche à une ou deux autres ;
- une **portée** : ce test, ce mouvement, cette session ; plus, indépendamment,
  un drapeau « cesse à la révélation du secret », parce que le livre écrit la
  disjonction (*Regarde dans l'abîme*) ;
- un **filtre d'approche** à trois valeurs : tous les tests, ceux du genre de la
  session, ceux hors genre de session.

Les modulations en cours vivent sur la prime. Elles s'éteignent à tout changement
de mouvement, à `resetSession()`, ou à la révélation du secret. Un groove peut en
poser plusieurs d'un coup ; rejouer un groove dont la modulation court grise son
bouton avec son motif, et rien n'est payé.

Rien de tout cela n'invente de primitive pour l'éditeur : la portée est due à neuf
grooves, le filtre à quatre, la substitution à cinq. C'est le test que
l'ADR 0008 s'était donné.

**Jam ! prête une règle, pas du matériel.** Le groove de l'assistant s'applique au
test ; une substitution prêtée ouvre les traits *de celui qui lance*, dans le genre
concerné. C'est ce qui distingue enfin Jam ! d'Assister.

## Pourquoi l'ADR 0009 n'est pas renversé

L'ADR 0009 nommait deux murs, et la portée les fait tomber tous les deux.

**Les droits** : une modulation vit sur la prime, que Big Shot possède. L'ADR 0009
dit lui-même que « le mur n'existe pas » dans ce cas — c'est déjà pourquoi les
deux riffs de fausse note de Big Shot sont réellement débités.

**Le temps** : le désavantage se fixe au lancer, dans une boîte locale au client
du joueur, donc Big Shot ne peut pas l'y écrire. Mais une modulation est posée
*avant* le jet et *persiste* : quand le joueur ouvre sa boîte, elle est déjà là.
La boîte lit déjà `genre` et `mouvement` sur la prime en jeu ; lire une modulation
au même endroit n'est pas un geste nouveau, et n'écrit sur la fiche de personne.

`risqueDisadvantage` reste un badge : joué sur la carte, après le jet, il bute
encore sur le temps.

## Options écartées

**Un moteur complet.** Couvrir les onze grooves de chasseur demande un vocabulaire
de conditions, quatre primitives qui lisent ou réécrivent des faces de dés, une
adjacence hexagonale qui n'existe nulle part, et un état qui survit à la carte.
Chacune serait due à exactement un groove — l'inverse du test de l'ADR 0008. Et
les cinq grooves de prime qui pilotent des cadrans resteraient hors de portée
quoi qu'il arrive ([ADR 0001](./0001-dials-delegated-to-sliced-dials.md)).

**Un champ et un catalogue en dur**, comme les huit riffs de `constants.ts`.
Écarté : une table ne peut pas écrire un groove sans toucher au code, alors que le
compendium des types de session prouve que le motif Item fonctionne pour du
contenu.

**Aucune portée**, les grooves de prime se rejouant à chaque test. Écarté : neuf
grooves écrivent « jusqu'à la fin du mouvement », et Big Shot compterait de tête
ce que la prime sait déjà tenir.

**Un filtre par genre explicite.** Écarté : le livre ne nomme jamais un genre, il
dit toujours « le genre de la session ». Un groove réglé sur rock deviendrait faux
à la session suivante.

**Prêter les traits de l'assistant** pour un Jam !. Écarté : la réserve du lanceur
contiendrait les traits d'un autre, et en entamer un pour corriger écrirait sur sa
fiche — ce que l'ADR 0009 interdit.

## Conséquences

- Huit grooves sur trente-trois sont réellement joués par le système : les cinq
  substitutions, plus Contrôle à distance, Raid spécial et Mission secrète. Deux
  autres sont approchés — *Maître-artificier* dit un plancher de fausses notes là
  où la primitive ajoute, *Passe-partout* offre un rachat en cartons qui n'a pas
  de forme. Les vingt-trois restants sont nommés et rappelés au moment où ils
  peuvent se déclencher, jamais appliqués.
- Le compendium embarque les trente-trois. Ce que le système ne joue pas, il le
  dit — une aide de jeu qui rappelle vaut mieux qu'un silence, et l'écart entre
  « joué » et « rappelé » doit rester lisible dans le compendium lui-même.
- Une modulation est nommée partout où elle agit. Un compte de dés qui baisse sans
  rien dire est exactement le défaut que le redessin des fiches de chasseur
  corrigeait déjà : « une aide de jeu qui ment en silence est pire qu'une aide
  absente ».
- La prime porte pour la première fois un état qui n'est ni un jeton, ni une
  configuration de départ : un effet en cours. `resetSession()` gagne un balai de
  plus, et le changement de mouvement gagne un effet de bord.
- Le champ texte `system.groove` disparaît du template `common`, sans migration —
  un MONO et un vaisseau mère n'ont jamais eu de groove.
- La ROADMAP cesse d'affirmer que le groove est un dé, et la conséquence de
  l'ADR 0009 sur Jam ! est tranchée plutôt que reportée.
