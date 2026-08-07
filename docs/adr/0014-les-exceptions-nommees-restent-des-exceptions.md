# 0014 — Six Grooves gardent des gestes et des états nommés

**Status:** accepted

Complète les [ADR 0012](./0012-riffs-et-grooves-partagent-un-moteur-d-activations.md)
et [0013](./0013-ce-qui-reste-hors-de-l-activation.md).

## Contexte

L'Activation couvre les règles composables sans mémoire. Six Grooves encore en
Rappel mélangent pourtant un effet calculable avec un choix, une mémoire ou un
fait que Foundry ne connaît pas. Les forcer dans le vocabulaire fermé ajouterait
des primitives à client unique et rouvrirait le moteur générique écarté par
l'ADR 0012.

*Faute de grives…* reste hors de ce lot : l'adjacence des traits dépend d'une
géométrie dont la fiche Foundry et celle du livre ne donnent pas la même lecture.

## Décision

**Ces règles sont des exceptions nommées.** Leur code reconnaît l'identifiant
stable du Groove ; elles ne deviennent ni des Effets configurables ni un second
moteur. Un instantané minimal voyage avec chaque Carte afin qu'un changement de
prime ne réécrive jamais un Test déjà lancé.

- **Enlèvement orbital.** Sliced Dials reste souverain. Big Shot ouvre et avance
  le cadran, puis active manuellement « Otages en sécurité » sur la prime active.
  Les `1` des nouveaux Tests du genre cessent alors de créer des fausses notes.
- **Plan sur le long terme.** Un chasseur peut mémoriser une face de l'étape
  courante de sa Carte, y compris grâce à un Groove prêté par Jam !, puis choisir
  de l'ajouter une fois à un Test ultérieur. Elle compte normalement au score,
  n'est pas écartée par un désavantage et ne survit ni à Quitte ou double ni au
  solde de la session.

  Cette formulation disait d'abord « une face réellement lancée ». Le mot
  excluait les faces écrites par *Hors des sentiers battus*, mais imposait de
  tracer l'origine de chaque dé pour distinguer une face écrite d'une face
  relancée par *Maître de la bidouille*, qui est bien lancée. L'origine n'est pas
  suivie : une face posée sur la Carte compte comme acquise, et la combinaison
  — écrire un 6 contre une fausse note, puis le mettre en banque — reste payée au
  prix de cette fausse note.
- **La vengeance est un plat qui se mange froid.** Big Shot lie manuellement un
  chasseur. Chaque unité de rythme et de cartouche devient fongible dans ses
  paiements, avec un choix explicite.
- **Les ombres du passé.** Big Shot désigne deux chasseurs distincts. Un paiement
  qui contient réellement du rythme prend deux cartouches fixes en plus, une
  seule fois. L'état manuel « Secret accepté » double les paiements de risque,
  mais jamais les boutons administratifs du compteur.
- **Marchandises dangereuses.** Un trait de MONO peut payer une troisième
  correction. La destruction du MONO et l'échec du mouvement restent un Rappel
  arbitré par Big Shot.
- **Plus c'est petit, plus ça mord fort.** Une correction par trait entame deux
  traits distincts de façon atomique, en relisant entre eux la priorité du MONO.
- **Passe-partout**, ajouté par l'[ADR 0015](./0015-la-difficulte-porte-un-offset-sur-la-prime.md).
  Une case de la boîte de jet échange un dé contre trois points d'Offset de
  difficulté, cochable à chaque test et cumulative ; deux cartons du test
  remettent l'Offset à zéro. Un choix et une mémoire, donc une exception nommée
  et non des Activations.

Les états manuels persistent jusqu'à ce que Big Shot les retire. Ils cessent
d'agir lorsque la prime n'est plus active et sont supprimés si son Groove est
retiré ou remplacé. Le solde de session n'efface que le résultat réservé, dont le
texte impose explicitement la même session.

## Composition et visibilité

Vengeance développe d'abord les combinaisons de rythme et de cartouches ; Ombres
ajoute ensuite ses deux cartouches non convertibles à toute combinaison contenant
du rythme. La même règle transforme une dette d'Assister/Jam !, mais la Carte ne
débite toujours jamais la fiche d'un autre chasseur (ADR 0009).

Big Shot configure les états sur la prime active. Un chasseur ne voit que les
choix et conséquences utiles à son geste ; les Cartes publiques consignent les
paiements choisis et le score obtenu, pas la configuration privée de la prime.

## Conséquences

- Le modèle ajoute `system.grooveState` aux primes et `system.plannedDie` aux
  chasseurs, sans mémoire générique.
- Quatre anciens Rappels deviennent entièrement joués ; deux ne rappellent plus
  que leur moitié manuelle. Le catalogue contient désormais onze Grooves avec
  Rappel.
- Les descriptions FR et EN disent explicitement ce qui est joué et ce qui reste
  sous l'arbitrage de Big Shot.
