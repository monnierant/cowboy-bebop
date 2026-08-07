# 0008 — Un riff porte son prix et ses effets

**Status:** accepted, partiellement révisé par l'ADR 0012

L'[ADR 0012](./0012-riffs-et-grooves-partagent-un-moteur-d-activations.md) fond
`RiffTerms` dans une Activation commune aux riffs et aux grooves. Le vocabulaire fermé
des paiements, la déduction du moment, le catalogue en pré-remplissage et la règle
« aucune primitive sans plusieurs clients » restent en vigueur : c'est le test que
l'ADR 0012 s'applique à lui-même.

## Contexte

L'[ADR 0003](./0003-la-prime-copie-son-type-de-session.md) a fait du type de
session le seul endroit qui dise **quels** riffs sont ouverts à chaque mouvement.
Il ne dit rien de ce qu'ils coûtent ni de ce qu'ils font : le catalogue de
`constants.ts` ne porte qu'un identifiant et un public, et les riffs ne sont
affichés qu'en badges avec leur rappel traduit au survol. Un seul est réellement
joué par le système — Quitte ou double, câblé en dur dans la carte.

Trois choses ont rendu ce partage intenable au moment de câbler les sept autres.

**Le livre déplace lui-même les prix.** Trois des quatre types de session livrés
dans le compendium le disent en toutes lettres : « on peut dépenser du rythme au
lieu de cocher une cartouche pour s'impliquer ou corriger les fausses notes »
(personnelle), « les cartouches ne servent pas : on dépense un point de rythme à
la place » (filler). Ces phrases vivaient dans le champ `setup`, de la prose que
Big Shot lit et applique de mémoire — pendant que le bouton de correction
débitait une cartouche que le type de session interdisait.

**Corriger n'est pas un riff.** C'est une règle de base du test, et pourtant
c'est ce que la session filler change en premier. Aucun des huit riffs du livre
ne peut porter ce réglage.

**Les riffs libres ne faisaient rien.** Le livre demande explicitement à la table
d'en inventer — « de nouveaux riffs, de nouvelles options de mouvement, d'autres
façons d'assister ou d'improviser — ajoutez-les ici même, mouvement par
mouvement ». Un riff libre n'était qu'un nom et une infobulle.

## Décision

Un riff, **à chaque mouvement**, porte trois choses : ses paiements acceptés, ses
effets, et son texte.

- **Paiements.** Une liste dont le joueur choisit un. Une entrée vaut un prix
  imposé, deux valent « au choix », zéro vaut gratuit. Le vocabulaire est fermé :
  cartouche, rythme, risque, trait entamé, trait misé, fausse note. Il couvre
  tous les prix du livre, y compris ceux qui ne sont pas des compteurs.
- **Effets.** Six primitives : des dés au groupement, un avantage ou un
  désavantage, un écart de seuil, des cartons, des fausses notes, des dommages
  effacés, une seconde approche. Ce ne sont pas des primitives inventées pour
  l'occasion : chacune est due à un riff du livre, donc écrite de toute façon.
  Les exposer coûte l'éditeur, pas le moteur.
- **Le moment ne se règle pas**, il se déduit de l'effet. Les dés, l'avantage et
  le seuil s'appliquent au lancer ; les cartons et les fausses notes sur la
  carte.
- **Corriger une fausse note** rejoint l'éditeur au même titre, comme règle de
  base et non comme neuvième riff. Elle porte déjà deux paiements dans le code —
  la cartouche et le trait entamé — donc la structure la décrit sans rien
  inventer.
- **Le stockage est additif.** `selected` reste la liste des identifiants
  cochés ; prix et effets vivent à côté. Un type de session écrit avant ce lot
  n'a pas ces champs et retombe sur le prix du livre, comme `riffSelection()`
  rend déjà une entrée vide pour un porteur jamais configuré. Aucune migration.
- **Pas de compteur d'usage.** Un riff est un bouton : on le joue, l'effet
  s'applique, et s'il reste jouable sur l'état qui en résulte, le bouton est
  encore là. Les réserves bornent d'elles-mêmes.

## Options écartées

**Laisser les prix dans le code, par riff.** C'est ce qui existait. Écarté :
c'est le livre lui-même qui les déplace de session en session, et l'endroit où
il le fait est exactement le type de session.

**Un prix par riff, valable aux trois mouvements.** Plus court à remplir.
Écarté : l'[ADR 0003](./0003-la-prime-copie-son-type-de-session.md) a déjà tranché
que les trois entrées sont indépendantes, précisément pour laisser écrire ce que
le livre n'a pas prévu. Un prix global reprendrait d'une main ce qu'elle a donné.

**Un mode fermé — cartouche, rythme, au choix, gratuit.** Le plus rapide à
saisir. Écarté : il ne sait ni exprimer un prix de deux, ni faire payer un
risque, ni décrire Quitte ou double et Forcer, dont les prix ne sont pas des
compteurs.

**Réécrire les huit riffs du livre dans ce vocabulaire.** Le plus uniforme.
Écarté : Quitte ou double — relancer, puis briser un trait selon le résultat — et
Solo ! — une fois par session, hors de tout test — n'y rentrent pas. La règle
« tout riff est une donnée » serait fausse dès le premier jour, ce qui est pire
que de ne pas la prétendre.

## Conséquences

- Le catalogue de `constants.ts` cesse d'être la seule vérité sur un riff. Il
  garde l'identifiant, le public et le prix **par défaut** — celui qu'on
  pré-remplit quand Big Shot coche le riff, pour qu'une session classique ne
  demande aucune saisie.
- Un riff libre peut désormais faire quelque chose, dans la limite des six
  primitives. Big Shot écrit de vrais riffs sans code, ce que le livre réclame
  pour les sessions filler.
- Le champ `setup` perd une partie de son rôle : ce qui n'était qu'un rappel à
  Big Shot devient un réglage que le système lit. La prose reste, elle ne fait
  plus autorité seule.
- Deux riffs du livre restent des exceptions codées et **ne sont pas
  reproductibles** par un riff libre. C'est inscrit au glossaire, pas caché.
- Les compteurs génériques de la boîte de jet — dés bonus, avantage, écart de
  seuil — sont **conservés**. Ils portent ce que Big Shot accorde au jugé, et
  restent le seul recours pour un effet que les six primitives ne décrivent pas.
- Ces réglages voyagent par copie dans la prime, comme le reste du type de
  session. Corriger un prix dans un type ne remonte pas dans les primes déjà
  préparées, conformément à l'ADR 0003.
