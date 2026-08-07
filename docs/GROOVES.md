# Catalogue des Grooves

Texte de règle issu des sources du jeu, mis en regard de ce que le système
implémente réellement. Ce fichier est la **référence de règle** ; il ne décrit pas
l'architecture (voir les ADR 0010 à 0014) ni le plan de travail (voir `ROADMAP.md`).

Trente-trois Grooves : onze de chasseur (`grooveHunter01`–`11`), vingt-deux de
prime (`groovePrime001`–`022`).

Colonne **État** :

- **Joué** — le moteur applique l'effet de bout en bout.
- **Approché** — le moteur applique quelque chose, mais pas exactement la règle.
- **Rappel** — le système affiche la règle ; l'application est à la charge du MJ.

Ce statut n'est plus écrit dans les descriptions : il se dérive des Activations,
des Rappels et de l'appartenance aux exceptions nommées, et un test du pack
refuse qu'on le ressaisisse à la main.

---

## Grooves de chasseur

Ces capacités permettent aux personnages des joueurs d'enfreindre certaines règles
de base.

| Id | Groove | Règle | État |
| --- | --- | --- | --- |
| `grooveHunter01` | Contre toute attente | Lors d'un test effectué avec désavantage, le joueur obtient un carton (un seul) s'il obtient un double autre qu'un double 6. | Joué |
| `grooveHunter02` | Détermination inébranlable | Lors d'un test avec désavantage, les traits endommagés de l'approche utilisée peuvent servir à ajouter des dés au groupement. | Joué |
| `grooveHunter03` | Faute de grives… | Lors d'un test utilisant une approche dont l'un des traits est endommagé, le joueur peut utiliser n'importe quel trait situé dans un **hexagone adjacent** au trait endommagé, même s'il dépend d'une autre approche. | Rappel — *bloqué*, voir §Faute de grives |
| `grooveHunter04` | Hors des sentiers battus | Juste après le lancer de dés, le joueur peut déclencher une fausse note pour transformer un résultat de 2, 3, 4 ou 5 en 6. | Joué — une fois par test |
| `grooveHunter05` | Loup solitaire | Permet d'utiliser systématiquement les traits de Rock pour les tests de Blues et de Jazz. | Joué |
| `grooveHunter06` | Maître de la bidouille | Lors d'un test avec désavantage, le joueur peut relancer le dé retiré et choisir d'en conserver le résultat. | Joué — une fois par test |
| `grooveHunter07` | Menottes lâches | Permet d'utiliser systématiquement les traits de Tango pour les tests de Dance ou de Jazz. | Joué |
| `grooveHunter08` | Miroir de l'âme | Permet d'utiliser systématiquement les traits de Dance pour les tests de Tango ou de Blues. | Joué |
| `grooveHunter09` | Plan sur le long terme | Après avoir lancé les dés, le joueur peut réserver un dé du résultat pour plus tard. Lors d'un test ultérieur dans la même session, ce dé peut être ajouté au nouveau résultat (avec sa valeur d'origine). **Un seul dé peut être réservé à la fois.** | Joué |
| `grooveHunter10` | Plus rapide que l'œil | Permet d'utiliser systématiquement les traits de Jazz pour les tests de Dance ou de Rock. | Joué |
| `grooveHunter11` | Souvenir de guerre | Permet d'utiliser systématiquement les traits de Blues pour les tests de Tango ou de Rock. | Joué |

Les cinq substitutions (`05`, `07`, `08`, `10`, `11`) ouvrent les traits du genre
substitué **sans accorder le dé de genre** — celui-ci reste conditionné à
`state.genre === state.category`.

---

## Grooves de prime

Ces capacités sont gérées par le narrateur (Big Shot) pour compliquer la tâche des
joueurs.

| Id | Groove | Règle | État |
| --- | --- | --- | --- |
| `groovePrime001` | Menace planétaire | Tous les deux tests des Chasseurs de Primes, la difficulté du mouvement augmente de 1. | Rappel (compteur non modélisé) |
| `groovePrime002` | Maître-artificier | En dépensant un risque, jusqu'à la fin du mouvement, les CP lancent un dé de moins lors des tests de l'approche liée au genre de session, et les autres approches génèrent au moins deux fausses notes. | Joué |
| `groovePrime003` | Enlèvement orbital | Crée un cadran H–4 spécial (« Les otages sont en sécurité »). Le premier carton d'un test lié au genre de session doit servir à l'avancer. Une fois clôturé, **les « 1 » ne génèrent plus de fausses notes** pour cette approche. | Approché — le cadran est manuel (Sliced Dials) ; l'état « otages en sécurité » est un interrupteur MJ ; **le plancher de fausses notes empêche d'atteindre 0** |
| `groovePrime004` | Comme un pro | En dépensant un risque hors test, Big Shot peut inverser les objectifs de deux cadrans ouverts. L'effet cesse si le secret est révélé. | Rappel (cadrans) |
| `groovePrime005` | Passe-partout | Avant un test, la difficulté augmente de 3, mais offre +1d6 au groupement. **Les CP peuvent annuler l'augmentation de difficulté en dépensant deux cartons.** | Joué — exception nommée : case dans la boîte de jet, +3 à l'Offset et +1 dé ; le rachat à deux cartons est un bouton de la boîte de collecte, offert sous ce Groove seul |
| `groovePrime006` | Esprit numérisé | En dépensant un risque, les actions non improvisées subissent un désavantage, tandis que les actions improvisées bénéficient d'un avantage. | Rappel |
| `groovePrime007` | Contrôle à distance | En dépensant un risque, les tests utilisant l'approche du genre de session se font avec désavantage jusqu'à la fin du mouvement. | Joué |
| `groovePrime008` | Marchandises dangereuses | Les traits de MONO peuvent corriger une fausse note supplémentaire. **Si un MONO est détruit, le mouvement est un échec automatique.** | Joué pour la 3ᵉ correction ; rappel pour la destruction du MONO |
| `groovePrime009` | Une offre que vous ne pouvez pas refuser | En dépensant un risque, les CP sont contraints d'utiliser un carton par test pour avancer un cadran choisi par Big Shot. | Rappel (cadrans) |
| `groovePrime010` | Jusqu'au bout | En dépensant un risque, chaque test sans carton génère +2 fausses notes ; un test avec un seul carton en génère +1. | Joué |
| `groovePrime011` | Roi de l'évasion | Quand un cadran est clôturé (sauf H–4), Big Shot peut dépenser un risque pour ouvrir un nouveau cadran spécial plus petit qui doit être rempli pour atteindre l'objectif. | Rappel (cadrans) |
| `groovePrime012` | Ça passe ou ça casse | Impose une suite de cadrans protecteurs (H–8, puis H–6, puis H–4) qui consomment obligatoirement un carton par test effectué par les CP. | Rappel (cadrans) |
| `groovePrime013` | Identité fictive | Empêche toute application de désavantage (par les CP ou Big Shot). Les dommages ne peuvent plus être éliminés via l'assistance ou la jam. | Joué |
| `groovePrime014` | Mission secrète | Les tests liés au genre de session subissent un désavantage tant que le secret n'est pas révélé. **Les cadrans d'objectif ne peuvent être clôturés qu'avec cette approche.** | Joué pour le désavantage ; rappel pour les cadrans |
| `groovePrime015` | La vengeance est un plat qui se mange froid | **Le CP ayant le moins de cartouches** peut dépenser son rythme comme des cartouches et vice-versa. | Approché — le chasseur est **choisi par le MJ**, non déduit des compteurs |
| `groovePrime016` | Raid spécial | En dépensant un risque, tous les tests n'utilisant pas le genre de session subissent un désavantage jusqu'à la fin du mouvement. | Joué |
| `groovePrime017` | Vue du dernier étage | Interdit aux CP de dépenser des cartons pour réduire la difficulté, **sauf s'ils jouent un Solo !**. | Joué — l'interdiction éteint le bouton ; jouer son Solo ! ouvre un droit unique |
| `groovePrime018` | Plus c'est petit, plus ça mord fort | Oblige les CP à endommager un trait supplémentaire pour corriger une fausse note (**les cartouches restent inchangées**). | Joué |
| `groovePrime019` | Une vie en lambeaux | Rend les objectifs et les conséquences des cadrans de menace vagues et difficiles à anticiper narrativement. | Rappel (narratif) |
| `groovePrime020` | Regarde dans l'abîme… | En dépensant un risque, les dommages ne peuvent pas être éliminés avant la fin du mouvement ou la révélation du secret. | Joué |
| `groovePrime021` | …Et l'abîme regarde en toi | *(même règle — les sources présentent les deux titres comme les deux faces d'un seul Groove)* | Joué |
| `groovePrime022` | Les ombres du passé | **Les CP les plus liés à la prime** ne peuvent dépenser de rythme qu'en cochant deux cartouches. Si le secret est révélé et accepté, **le Big Shot doit payer double risque pour activer ses effets**. | Joué — les chasseurs liés sont désignés par le MJ (exactement deux) |

`groovePrime020` et `groovePrime021` portent volontairement la même mécanique :
les sources les présentent sous un titre unique à deux volets. Ce n'est pas un
doublon accidentel.

---

## Faute de grives — divergence à trancher

Le Groove suppose une adjacence **hexagonale** entre traits, franchissant les
frontières d'approche. La fiche PDF dessine les quinze traits en nid d'abeille :
chaque hexagone touche jusqu'à six voisins et les secteurs d'approche sont
contigus — c'est ce qui rend « même depuis une autre approche » signifiant.

La fiche Foundry stocke `system.traits` comme cinq tableaux plats de trois entrées
`{name, dented, broken}` (`src/template.json`), sans coordonnée ni arête, rendus en
lignes de trois cases rectangulaires. La seule adjacence dérivable est « index ±1
dans le même tableau », c'est-à-dire **à l'intérieur d'une seule approche** :
exactement la moitié de la règle.

Deux issues possibles, aucune tranchée à ce jour :

1. La fiche Foundry adopte la géométrie du PDF — une position par trait et un
   graphe de voisinage.
2. Le Groove est réinterprété en adjacence linéaire définie par la fiche — et son
   texte doit alors être réécrit, car « même depuis une autre approche » devient
   faux.

Tant que ce n'est pas tranché, le Groove reste hors automatisation (ADR 0014).

---

## Écarts relevés entre ce catalogue et l'implémentation

Arbitrés en session de conception, puis livrés. La colonne **État** ci-dessus
reflète l'implémentation actuelle.

**Clos sans changement :**

- *Enlèvement orbital* atteint le plancher de fausses notes du mouvement, jamais
  zéro. C'est la bonne lecture : « les 1 ne génèrent plus de fausses notes »
  retire leur contribution, et le jet retombe dans le cas nominal « aucun 1 » où
  le mouvement impose son compte. Le Groove plafonne les mauvais jets.
- *La vengeance* garde son chasseur lié **choisi par Big Shot**, contre la lettre
  du livre (« le CP ayant le moins de cartouches »). Une cible calculée se
  déplace à chaque cartouche cochée, y compris entre le lancer et la collecte
  d'une Carte ouverte — l'ADR 0014 avait tranché pour cette raison.
- *Plan sur le long terme* laisse réserver toute face de l'étape courante, y
  compris écrite par *Hors des sentiers battus*. L'ADR 0014 est amendé en
  conséquence.
- Les Rappels des Grooves de prime sans Activation restent consultables au
  tooltip du slot et n'atteignent pas le chat. C'est la documentation qui laissait
  croire l'inverse.

**En suspens, hors lot :** le drapeau `secret` d'une Activation (déclaré partout,
sans consommateur) et *Faute de grives* (bloqué sur la géométrie PDF/Foundry).

**Corrigés**, avec ce qui les fermait :

1. ***Vue du dernier étage* était sans effet.** `cartonAgainstDifficulty` était
   déclaré depuis l'ADR 0012 mais l'action qu'il interdit n'existait pas. L'ADR
   0015 la construit ; l'interdiction éteint désormais le bouton, et le Solo !
   ouvre le droit qui la lève.
2. ***Passe-partout* déclarait une interdiction absente de la règle.** Son rachat
   a maintenant une forme, et le Groove est passé aux exceptions nommées.
3. **Le paiement de plusieurs riffs faisait perdre des jetons.** La boucle
   débitait riff par riff et sortait à la première option impayable sans
   rembourser. Le coût part désormais en une écriture par fiche.
4. **Le prix de *Hors des sentiers battus* était codé en dur.** Le moteur lit
   `paymentOptions` sur les activations instantanées, et le nom du Groove voyage
   avec l'activation gelée.
5. ***Maître de la bidouille* était répétable à l'infini.** Une relance par test,
   consommée même si le joueur refuse le résultat.
6. **Transformer un dé rendait les deux corrections.** Le plafond reste global au
   test ; seul Quitte ou double le rend, parce qu'il relance tout.
7. **Un slot *Vengeance* vide liait tout le monde.** La chaîne vide ne s'égalise
   plus avec un acteur non résolu.
8. **Assister prêtait le groove comme Jam !.** Le prêt est redevenu la clause
   propre à Jam !.
9. **`state.running` était calculé à avantage 0**, si bien qu'une Activation
   conditionnée `underDisadvantage` manquait à l'affichage et aux effets de carte.
10. **Le pack EN annonçait « Reminder only » pour cinq Grooves joués**, et un
    rappel restait en français. Le statut se dérive désormais, et un test du pack
    vérifie la parité des traductions.

**Reste ouvert :** le drapeau `secret` (constat livré, session à part) et *Faute
de grives* (bloqué sur la géométrie PDF/Foundry).

Point **résolu** par ce catalogue : le doublement de risque des *Ombres du passé*
porte bien sur les paiements du **Big Shot** (« le Big Shot doit payer double
risque pour activer ses effets »). La restriction de `bigshotPaymentOptions` aux
riffs d'audience `bigshot` est donc conforme, et non un trou.
