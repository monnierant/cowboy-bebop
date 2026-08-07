# 0013 — Ce qui reste hors de l'Activation

**Status:** accepted

Achève l'[ADR 0012](./0012-riffs-et-grooves-partagent-un-moteur-d-activations.md).

## Contexte

L'ADR 0012 a fusionné `RiffTerms`, `Modulation` et `GrooveRule` dans une unité unique,
l'Activation. Les **données** ont suivi : les trente-trois grooves du compendium sont
écrits au format Activation, et aucun n'utilise plus `payments`, `rules` ni
`modulations`. Le **code**, non. Les deux moteurs cohabitent encore :

- `grooveRules.ts` existe en entier et le dialogue de jet collecte des `GrooveRule` que
  plus rien ne produit ;
- une garde ad hoc — `Array.isArray(prime.system.activations) ? [] : modulationEffects(…)`
  — empêche la double application des effets ;
- la feuille d'un groove dessine trois sections mortes : les règles de calcul, le prix
  du groove, et les modulations ;
- côté riff, le doublon est pire car il est actif en écriture : chaque geste de
  l'éditeur écrit `terms`, `activations` et `riff.payments/effects` en même temps.

Le glossaire portait la même dette, en plus visible : sur quinze entrées de la couche
mécanique, cinq décrivaient des notions dissoutes ou explicitement écartées par l'ADR
0012 — *Mécanique* (qui redéfinissait Activation mot pour mot), *Règle de Groove*,
*Modulation*, *Trace de résolution* et *État de Groove*, ces deux dernières nommant des
fonctionnalités que l'ADR 0012 avait refusées.

Une question se pose alors, et c'est celle que cet ADR existe pour trancher : **si
l'Activation absorbe tout, pourquoi la Substitution et le Rappel lui échappent-ils ?**
Le compendium montre que ce ne sont pas des cas marginaux — cinq grooves n'ont qu'une
Substitution, quinze n'ont qu'un Rappel.

## Décision

**Un Groove porte trois choses et seulement trois** : ses Activations, sa Substitution,
ses Rappels. Plus son nom, son portrait, son public et sa description. Rien d'autre.

**Une Activation ne nomme jamais un genre.** C'est la frontière qui tient la
Substitution dehors, et elle était déjà la règle sans être écrite : le vocabulaire des
Conditions de l'ADR 0012 est *relatif* — sous désavantage, du genre de session, hors
genre de session — parce que « le livre ne nomme jamais un genre en particulier ». La
Substitution fait exactement l'inverse : elle écrit `rock → [blues, jazz]` en dur, et
c'est le seul endroit du système qui le fasse. Elle est de surcroît automatique — le
livre dit « utiliser systématiquement » — donc sans prix, sans condition et sans
expiration : les trois quarts d'une Activation lui seraient vides.

**Un Rappel n'applique rien.** L'Activation est ce que le système applique ; le Rappel
est ce qu'il dit et n'exécute jamais. C'est la même frontière que celle de
l'[ADR 0001](./0001-dials-delegated-to-sliced-dials.md) — les cadrans restent chez Big
Shot — vue depuis le Groove.

**Les trois moteurs de l'ancienne forme sont supprimés, pas dépréciés.** `GrooveRule`,
`Modulation`, `RiffTerms`, leurs normaliseurs, leurs éditeurs et les branches du moteur
qui les lisaient disparaissent. Aucun monde de jeu n'existe, le compendium est régénéré
au build, et l'ADR 0012 avait déjà écarté tout format de compatibilité.

**Le mot « Modulation » disparaît avec l'objet.** Une Activation persistante qui court
sur la prime est une *Activation en cours*, gelée avec le nom du Groove qui l'a posée.
Le mot avait été inventé par l'[ADR 0010](./0010-un-groove-pose-des-modulations.md) pour
une composition — effets, portée, filtre, règles — que l'ADR 0012 a dissoute ; le garder
pour l'instance aurait laissé un lecteur chercher l'ancien objet.

**La correction d'une fausse note reste hors Activation**, comme l'ADR 0008 puis l'ADR
0012 l'ont tranché : c'est une règle de base du Test. Elle garde donc un éditeur de prix
seul, et c'est le seul endroit où unifier serait faux.

## Options écartées

**La Substitution comme Effet composé** — `substituteApproach {from, to[]}` sur une
Activation sans condition ni prix. Le Groove se réduirait à description + activations +
rappels, une seule enveloppe. Écartée : ce serait le premier Effet à porter une charge
composée là où tous les autres portent un scalaire ou une énumération fermée, et le
premier endroit où une Activation nomme un genre. L'uniformité serait de surcroît en
partie cosmétique — la substitution s'applique hors moteur, avant tout jet, sans passer
par les conditions ni par un paiement, donc le consommateur irait quand même pêcher ces
effets-là spécifiquement. Enfin l'éditeur y perdrait : un menu source et cinq cases
cibles se lisent mieux qu'une ligne d'effet.

**La Substitution pleinement décomposée** — une condition « approche du test = X » plus
un effet « ouvrir l'approche Y ». Écartée : les conditions étant conjointes, *Loup
solitaire* passerait d'une ligne à deux Activations, une par genre cible, et le
vocabulaire des conditions s'ouvrirait aux genres nommés — exactement ce que l'ADR 0012
refuse en disant « `ApproachFilter` généralisé, pas un moteur booléen ».

**Le Rappel porté par l'Activation.** L'ADR 0012 l'envisageait (« dans le chat lors d'une
Activation payée »). Écartée : quinze Rappels sur seize appartiennent à un Groove qui n'a
aucune Activation. Les y rattacher imposerait à ces quinze-là une Activation creuse —
sans condition, sans prix, sans effet — dont l'unique rôle serait de transporter du
texte. Un déguisement, pas un regroupement.

**Garder la lecture des anciennes formes.** Écartée pour la raison de l'ADR 0012 : aucun
monde de jeu n'existe, et une conversion à la lecture est précisément ce qui a permis aux
deux moteurs de cohabiter un an.

**Deux noms, Activation pour la définition et Modulation pour l'instance.** Écartée :
la distinction définition/instance est réelle mais se dit par un adjectif, et le mot
disponible traînait la définition d'un objet supprimé.

## Conséquences

- Un seul moteur, un seul éditeur, un seul vocabulaire pour les Riffs et les Grooves.
  C'est l'étape 4 de la réalisation prévue par l'ADR 0012.
- Le glossaire passe de quinze entrées mécaniques à dix, toutes vivantes.
- **Un trou apparaît et doit être bouché** : aucun gabarit du système ne mentionne un
  Rappel. Quinze grooves portent un texte que personne ne peut modifier dans Foundry, et
  une feuille qui ne montrerait que deux des trois choses qu'un Groove porte mentirait
  autant que l'éditeur de JSON qu'elle remplace.
- La réalisation a été ordonnée pour que chaque étape livre seule. **1.** Le Groove — le
  modèle écrit, le legacy supprimé, l'éditeur de Rappels ajouté. **2.** Le Riff —
  `RiffTerms` supprimé et le même éditeur d'Activation réutilisé sur la feuille d'un type
  de session. Les deux sont faites.
- **Le formulaire d'Activation vit dans un seul module**, `activationEditor.ts` : les
  lignes qu'il dessine, les vingt gestes qui les modifient, et le câblage. Il ne sait pas
  *où* une activation est rangée — chaque ligne porte une cible opaque que son appelant a
  fabriquée et qu'il est seul à relire. Une feuille de groove l'adresse par le rang de
  l'activation, un type de session par son mouvement et l'identifiant de son riff.
- **Un riff y gagne des prix composés.** L'ancien `RiffTerms.payments` était une liste de
  dépenses *alternatives* : une option à deux dépenses ne pouvait pas s'écrire, et
  `riffTermsOf` la jetait silencieusement en aplatissant les options. Un riff accepte
  désormais « un rythme **et** une cartouche » comme un groove, sans qu'aucune primitive
  n'ait été ajoutée — c'était déjà ce que l'ADR 0012 décrivait, seul l'éditeur ne savait
  pas l'écrire.
- **Un riff n'a pas d'horloge.** Le formulaire partagé masque la rangée de durée pour un
  riff : le livre ne lui en donne jamais, il s'applique au test qu'on joue. Seul un
  Groove persiste.
- Les trente-trois grooves du compendium ne bougent pas : ils étaient déjà au format que
  cet ADR rend unique.
