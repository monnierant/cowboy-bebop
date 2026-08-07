# 0011 — Les grooves portent des règles de calcul activables

**Status:** superseded by [ADR 0012](./0012-riffs-et-grooves-partagent-un-moteur-d-activations.md)

## Contexte

L'[ADR 0010](./0010-un-groove-pose-des-modulations.md) limitait les grooves aux
substitutions et aux effets additifs des modulations. Cette limite laissait en rappel
plusieurs exceptions que le moteur peut pourtant calculer sans état extérieur : un
double sous désavantage, un plancher de fausses notes, ou l'interdiction du
désavantage.

**La tension avec l'ADR 0010, dite franchement.** Cet ADR écarte le « moteur complet »
au motif que chaque primitive serait « due à exactement un groove — l'inverse du test
de l'[ADR 0008](./0008-un-riff-porte-son-prix-et-ses-effets.md) ». Les cinq règles
ci-dessous sont dans ce cas exact : *Contre toute attente*, *Détermination
inébranlable*, *Identité fictive*, *Maître-artificier* et *Jusqu'au bout* en réclament
une chacun, et personne d'autre.

L'ADR 0010 n'est pourtant pas renversé, parce que son argument portait sur le **coût**
et non sur le décompte. Les primitives qu'il refusait demandaient un vocabulaire de
conditions, une adjacence hexagonale absente de la fiche, et un état survivant à la
carte. Celles-ci ne demandent rien : ce sont des fonctions pures du groupement et du
score déjà calculés. « Plusieurs clients » était un indicateur du coût, pas le critère
lui-même, et c'est le seul cas connu où l'indicateur se trompe.

## Décision

Un Item Groove peut porter des `rules` activables. Une règle désactivée reste
configurée mais n'agit pas. Une modulation peut porter les mêmes règles ; elles
ne s'appliquent alors qu'entre l'activation de la modulation et son expiration.

**Le critère d'admission est explicite, et il remplace le décompte pour cette
famille :** une règle entre si elle est une fonction pure du groupement et du score
déjà calculés. Rien qui lise un état extérieur, rien qui écrive ailleurs que sur le
résultat, rien qui demande une action. Ce critère admet les cinq ci-dessous, exclut
tout ce qui est nommé en *Limite*, et **n'ouvre pas le vocabulaire** : une règle qui le
satisfait entre quand même par un ADR, jamais par configuration.

Le vocabulaire initial couvre :

- le carton de *Contre toute attente* ;
- les traits endommagés de *Détermination inébranlable* ;
- l'interdiction du désavantage d'*Identité fictive* ;
- le plancher de fausses notes de *Maître-artificier* ;
- les fausses notes selon les cartons de *Jusqu'au bout*.

Les règles sont gelées sur la carte avec le test. Une modification ultérieure du
Groove ne réécrit donc pas un résultat déjà lancé.

## Options écartées

**Laisser ces cinq grooves en rappel**, comme l'ADR 0010 les y laissait. Écarté :
l'implémentation entière tient en 82 lignes sans état, testées ligne à ligne dans
`test/grooves.mjs`. Refuser cela au nom d'une règle dont le but était d'éviter la
dépense reviendrait à appliquer l'indicateur contre son objet.

**Attendre qu'une règle ait un second client** avant de l'écrire. Écarté : le livre
est publié et fini. Aucune de ces cinq n'aura jamais de second client, donc la
règle serait un refus définitif déguisé en ajournement.

**Coder chacune en dur, comme Quitte ou double et Solo !** ([ADR 0008](./0008-un-riff-porte-son-prix-et-ses-effets.md)).
Écarté : ces deux-là sont codés en dur parce qu'ils *échappent* au vocabulaire — ils
agissent hors de tout barème. Ces cinq-ci s'expriment au contraire toutes dans le même
`(dice, score, advantage) → score`. Les disperser dans cinq exceptions nommées coûterait
plus cher que la famille, et interdirait de les poser sur une modulation.

**Un vocabulaire d'expressions ou de formules**, que Big Shot composerait. Écarté :
c'est l'usine à gaz que l'ADR 0010 refuse à juste titre. Cinq entrées nommées se lisent ;
un langage de formules demande une grammaire, une validation, des messages d'erreur et
un éditeur, pour cinq usages connus d'avance.

**Ne porter les règles que sur le Groove, pas sur la Modulation.** Le plus simple.
Écarté : *Maître-artificier* et *Jusqu'au bout* paient un risque pour un effet qui dure
un mouvement, donc leurs règles doivent expirer avec la modulation. Ce choix a un prix,
reconnu ci-dessous.

## Limite

Réécrire ou relancer une face et réserver un dé entre deux cartes ne sont pas de
simples fonctions du groupement et du score. Ces grooves nécessitent des actions
de carte et, pour le dernier, un état de session ; ils ne sont pas déguisés en
règles de calcul.

## Ce que cet ADR a manqué

Constaté après coup, à la relecture qui a produit l'ADR 0012. Consigné ici pour que le
précédent ne se rejoue pas ailleurs.

- **`enabled` n'a aucun client.** Aucun groove du compendium ne ship `enabled: false`,
  et `normalizeGrooveRule` traite l'absence comme vrai — donc absent et actif sont
  indistinguables. Une règle qu'on ne veut pas se supprime. Le drapeau ajoute une case
  à cocher par règle dans l'éditeur, pour rien.
- **`amount` est ignoré par trois règles sur cinq**, ce que `types.ts` admet en
  commentaire, tandis que `amountOf` force toute valeur absente ou invalide à `1` — un
  `1` sans signification stocké dans le compendium. À l'inverse, le plafond de deux
  cartons de *Contre toute attente* est codé en dur alors que `minimumNotes` expose le
  sien. Le paramétrage est incohérent dans les deux sens.
- **« Règle de calcul » recouvre trois moments.** Le nom promet une famille homogène,
  mais `applyAdvantageRules` agit avant le jet, `applyResultRules` après, et
  `dentedTraitsOnDisadvantage` ni l'un ni l'autre : il change ce qui *entre* dans le
  groupement, traité à part dans la boîte de jet. Cette dernière n'est pas une règle de
  calcul, elle en porte le costume.
- **Les règles vivent à deux endroits** — sur le Groove et sur la Modulation — sans que
  cet ADR dise lequel choisir. Le lecteur doit deviner « permanent sur le groove,
  temporaire sur la modulation ». C'est la duplication que l'ADR 0012 supprime en
  fondant les deux dans une Activation unique.

L'ADR 0012 reprend les cinq règles et doit résoudre ces quatre points, pas les hériter.
