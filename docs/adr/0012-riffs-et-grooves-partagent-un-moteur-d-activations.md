# 0012 — Riffs et Grooves partagent un moteur d'Activations

**Status:** accepted

Supersède l'[ADR 0011](./0011-les-grooves-portent-des-regles-de-calcul.md) et révise
l'[ADR 0008](./0008-un-riff-porte-son-prix-et-ses-effets.md) et
l'[ADR 0010](./0010-un-groove-pose-des-modulations.md).

## Contexte

Trois ADR ont construit le même vocabulaire trois fois. L'ADR 0008 a donné aux riffs
des `payments` et des `effects`. L'ADR 0010 a donné aux grooves *les mêmes* paiements
et *les mêmes* effets, plus une portée et un filtre. L'ADR 0011 a ajouté des `rules`
aux deux. Le code montre le résultat : `riffs.ts` et `grooves.ts` pèsent 793 et 916
lignes, `riffTerms.ts` et `grooveTerms.ts` appliquent deux fois le même barème, et
`RiffTerms` et `Modulation` ne diffèrent dans `types.ts` que par ce qui persiste.

Deux moteurs pour un vocabulaire est la duplication à supprimer. Ce n'est pas la même
chose que réclamer un moteur générique, et l'ADR 0010 avait raison d'écarter celui-là.

**Ce que le compendium dit exactement.** Sur les trente-deux grooves livrés, onze sont
pleinement joués, deux approchés, dix-neuf en simple rappel. Sur ces dix-neuf, huit ne
seront jamais joués : six pilotent des cadrans, hors de portée par
l'[ADR 0001](./0001-dials-delegated-to-sliced-dials.md), et deux sont de la consigne
narrative. Restent onze rappels dont **six à huit** sont atteignables, et ils se
rangent en exactement deux familles :

- **Interdire** plutôt qu'ajouter. *Et l'abîme regarde en toi* et *Regarde dans
  l'abîme* interdisent d'éliminer un dommage ; c'est aussi la moitié d'*Identité
  fictive* que le système laisse en rappel ; *Vue du dernier étage* interdit de
  dépenser des cartons contre la difficulté. **Quatre clients.**
- **Transformer un résultat déjà lancé.** *Hors des sentiers battus* réécrit une face,
  *Maître de la bidouille* relance le dé retiré. L'ADR 0011 les avait écartés faute
  d'endroit où l'écrire. Quitte ou double fait déjà exactement cela, codé en dur depuis
  l'[ADR 0007](./0007-un-test-vit-sur-sa-carte.md). **Trois clients.**

Ces deux familles passent le test de l'ADR 0008 — plusieurs entrées du livre les
exigent, elles seront écrites de toute façon. Rien d'autre dans le moteur ne le passe.

## Décision

**Une Activation est l'unité unique.** Riffs et Grooves restent deux concepts du jeu —
les premiers sont ouverts et payés dans une session, les seconds sont possédés et
prêtés par Jam ! — mais une seule structure porte leurs mécaniques. Une Activation
atomique réunit des Conditions, des options de Paiement, des Effets, et — si elle
persiste — sa portée et son drapeau de secret. `RiffTerms`, `Modulation` et
`GrooveRule` fusionnent en elle ; l'assemblage `payments + effects + rules +
modulations` disparaît.

**Les vocabulaires restent fermés.** Les paiements demeurent les six de l'ADR 0008,
inchangés. Les effets sont les sept de l'ADR 0008, plus les cinq règles de l'ADR 0011,
plus **une seule primitive neuve** : *interdire*, paramétrée par ce qu'elle interdit —
éliminer un dommage, dépenser un carton contre la difficulté. Une entrée s'ajoute par
un ADR, quand plusieurs entrées du livre la réclament ou qu'elle satisfait le critère
de l'ADR 0011 — une fonction pure du groupement et du score. Jamais par configuration :
il n'y a pas de catalogue ouvert.

**Les cinq règles de l'ADR 0011 entrent réparties, pas en bloc.** Elles ne formaient
une famille que par accident d'implémentation, et le moteur les range là où leur
moment les met, selon la règle ci-dessus qui veut que le moment se déduise du type :

- *l'interdiction du désavantage* d'**Identité fictive** est une **interdiction**,
  la même primitive que celle qu'on ajoute pour les grooves d'abîme ;
- *le plancher de fausses notes* de **Maître-artificier** est une **borne** ;
- *le carton sous désavantage* de **Contre toute attente** et *les fausses notes selon
  les cartons* de **Jusqu'au bout** sont des **variations** ;
- *les traits endommagés* de **Détermination inébranlable** n'est pas une règle de
  calcul du tout : elle change ce qui **entre** dans le groupement, avant le jet. Elle
  rejoint les effets de groupement, avec les dés.

L'ordre canonique — interdictions, remplacements, variations, bornes — les classe donc
déjà toutes les quatre, et la cinquième n'en relevait jamais.

**Une Activation n'a pas de drapeau d'activation.** Le `enabled` de l'ADR 0011
disparaît : aucun groove du compendium ne l'a jamais mis à faux, et une règle qu'on ne
veut pas se supprime. De même, un Effet ne porte un montant que lorsque son type en
admet un ; les types booléens n'en stockent aucun, au lieu du `1` sans signification
que l'ADR 0011 écrivait dans le compendium.

**Les Conditions sont toutes conjointes.** Une alternative s'écrit comme une autre
Activation. Le vocabulaire initial est celui qu'imposent les grooves déjà joués : sous
désavantage, du genre de session, hors genre de session. C'est `ApproachFilter`
généralisé, pas un moteur booléen.

**Les Effets simultanés suivent un ordre canonique**, sans priorité manuelle :
interdictions, remplacements, variations, puis bornes. Personne ne règle un rang.

**Le moment ne se règle pas**, chaque type d'Effet impose le sien — l'ADR 0008
inchangé. Le lieu de stockage se déduit de la portée, comme aujourd'hui : la carte
pour un test, la prime active pour un mouvement ou une session.

**Les Paiements sont des alternatives composées** : l'option choisie s'applique
entièrement ou pas du tout. Une dépense due par un autre chasseur reste une dette
visible, conformément à l'[ADR 0009](./0009-ecrire-seulement-sur-la-fiche-quon-joue.md).

**Une Activation invalide est conservée pour réparation mais entièrement bloquée** :
aucun bouton, aucun paiement, aucun effet partiel.

**Réactiver bloque, et rien d'autre.** C'est déjà la règle de l'ADR 0010 : rejouer un
groove dont la modulation court grise son bouton avec son motif, rien n'est payé.
Aucune entrée du livre ne demande à cumuler, rafraîchir ou remplacer.

**L'historique du Test est append-only sur une seule carte.** Les anciennes étapes sont
barrées, la dernière seule est courante et collectable. Relances et transformations
ajoutent une étape sans effacer les précédentes. C'est ce qui donne un endroit à
*Hors des sentiers battus*, à *Maître de la bidouille*, et à Quitte ou double qui
cesse d'être une exception. Les Activations sont gelées sur la carte avec le test :
modifier un Groove ne réécrit pas un résultat lancé (ADR 0011, conservé).

**Le moteur n'a pas de mémoire.** *Menace planétaire* et *Plan sur le long terme*
restent deux exceptions nommées, comme Quitte ou double et Solo ! le sont depuis
l'ADR 0008. Deux cas ne font pas une abstraction.

**Le catalogue des riffs du livre reste dans le code**, en pré-remplissage, comme
l'ADR 0008 l'a fixé. Riffs et Grooves partagent le même éditeur d'Activation dans deux
fiches qui gardent leurs enveloppes métier distinctes.

**Les Grooves à cadrans ne pilotent pas Sliced Dials** (ADR 0001). Ils portent un
rappel affiché sur la prime, sur la carte quand le contexte est connu, ou dans le chat
lors d'une Activation payée. Chaque rappel choisit `Big Shot uniquement` ou `Toute la
table`, avec un défaut privé pour une prime et public pour un chasseur.

## Options écartées

**Deux catalogues extensibles de plugins internes typés.** La forme la plus ouverte.
Écartée : le livre est publié et fini — huit riffs, trente-deux grooves. L'extensibilité
répond à du contenu inconnu, et il n'y en a pas. Elle supprime surtout le seul
garde-fou que ce système possède, la règle de l'ADR 0008 qu'aucune primitive n'entre
sans plusieurs clients. Un catalogue ouvert rend cette règle inapplicable par
construction.

**Quatre politiques de Réactivation** — bloquer, rafraîchir, cumuler, remplacer.
Écartée : trois d'entre elles n'ont aucun client dans le livre. Bloquer est déjà
implémenté et suffit.

**Une mémoire générique à porteur et échéance.** Écartée : ses deux seuls clients
sont *Menace planétaire* et *Plan sur le long terme*, et il faudrait de toute façon
les nommer dans le moteur. On paierait l'abstraction *et* l'exception.

**Une trace nommée par résolution, avec Conditions satisfaites et valeurs
avant/après.** Un journal d'audit complet. Écartée de ce lot : zéro entrée du livre ne
l'exige. Ce que l'ADR 0010 réclame — qu'une modulation soit nommée partout où elle
agit — est déjà tenu par l'affichage. Le journal reste une amélioration possible,
séparée.

**Matérialiser au build les Activations complètes et localisées dans chaque mouvement
de chaque type de session.** Écartée : huit riffs × trois mouvements × N types de
session × chaque langue, dupliqués dans le compendium, et corriger une coquille dans
un riff du livre demanderait un rebuild. L'ADR 0008 a gardé le catalogue en
pré-remplissage précisément pour ça ; le renverser demanderait son propre argument.

**Ne rien faire, et garder les trois couches.** Écartée : c'est la duplication réelle,
mesurable dans `riffTerms.ts` et `grooveTerms.ts`, et elle grandit à chaque groove.

## Conséquences

- Onze grooves pleinement joués aujourd'hui, dix-sept à dix-neuf après. Huit restent
  hors de portée pour toujours, et le compendium continue de dire lesquels : l'écart
  entre « joué » et « rappelé » reste lisible (ADR 0010).
- **Une seule primitive d'effet est ajoutée** — interdire. Les paiements ne bougent
  pas. C'est le test de l'ADR 0008 tenu, pas contourné.
- **Les quatre dettes reconnues par l'ADR 0011 sont soldées, pas héritées** : le
  drapeau `enabled` disparaît, un montant n'existe que là où il a un sens,
  `dentedTraitsOnDisadvantage` quitte une famille dont elle n'était pas, et les règles
  cessent de vivre à deux endroits puisque le Groove et la Modulation fusionnent dans
  l'Activation. Le compendium des grooves est régénéré en conséquence, sans migration.
- Aucun format de compatibilité ni migration : aucun monde de jeu n'existe encore.
  Le compendium des grooves est régénéré au build.
- La réalisation est ordonnée pour que chaque étape livre seule. **1.** L'historique
  du Test — utile même si rien ne suit, et il rend Quitte ou double ordinaire.
  **2.** L'Activation unique, avec conversion des riffs et grooves déjà joués et
  suppression des anciens moteurs. **3.** L'interdiction et les grooves qu'elle
  débloque. **4.** L'éditeur partagé et les rappels. Si l'étape 2 se révèle fausse,
  l'étape 1 reste acquise.
- La correction des fausses notes reste une règle de base du Test, pas une Activation,
  comme l'ADR 0008 l'a tranché.
- Les cadrans et les effets purement narratifs restent sous la responsabilité de Big
  Shot.
