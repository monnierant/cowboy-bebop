# What is left to do

## ADR 0011 / 0012 — Activations *(implémenté)*

- Riffs et Grooves passent par le même vocabulaire d'Activation : Conditions
  conjointes, options de Paiement composées, Effets et portée éventuelle.
- Les cinq règles de l'ADR 0011 sont conservées dans leur moment correct, sans
  `enabled` ni montant factice.
- Les interdictions, les transformations de résultat et l'historique append-only
  du Test sont jouables sur la carte.
- Le compendium ne stocke plus `payments + rules + modulations`; chaque Groove
  contient des `activations` et des rappels à visibilité explicite.
- Une Activation invalide reste éditable dans son Item mais le moteur ne
  l'exécute pas et ne propose aucun paiement partiel.

## Le lot « riffs jouables »

**Écrit et compilé ; rien n'a tourné dans Foundry.** Le vocabulaire est tenu par
`npm test` — `test/riffs.mjs` couvre la normalisation, la déduction des phases,
le cumul des effets et les gardes de Forcer — et `test/chat-card.mjs` compile la
carte avec ses nouveaux blocs. Tout le reste est à vérifier à une table : voir la
liste en fin de section.

Voir l'[ADR 0008](./adr/0008-un-riff-porte-son-prix-et-ses-effets.md)
pour le prix et les effets portés par le type de session, et
l'[ADR 0009](./adr/0009-ecrire-seulement-sur-la-fiche-quon-joue.md) pour ce qu'on
refuse d'écrire.

Aujourd'hui les riffs ne sont que des badges à survoler, à une exception près :
Quitte ou double, câblé en dur dans la carte. L'objet du lot est de rendre les
huit jouables, de faire payer ce qu'ils coûtent, et d'ouvrir le même mécanisme
aux riffs libres.

### ~~Lot 1~~ — Le vocabulaire, sans interface *(fait)*

Rien de visible ; tout le reste en dépend.

- Les deux vocabulaires fermés — six paiements, six effets — et leurs types.
- Le prix par défaut de chacun des onze riffs du catalogue, plus celui de la
  correction, dans `constants.ts`. C'est ce qu'on pré-remplit quand Big Shot
  coche un riff, pour qu'une session classique ne demande aucune saisie.
- La lecture additive : `riffSelection()` rend le prix stocké, ou le prix du
  livre quand le champ n'existe pas. Un type de session écrit avant ce lot doit
  se charger sans rien perdre — c'est ce qui remplace une migration.
- Les transitions manquantes dans `rolls/testState.ts` : ajouter des cartons,
  ajouter des fausses notes, effacer des dommages. Pures, tenues par
  `test/state.mjs` comme le reste.
- Une fonction qui dit, pour un porteur donné et un riff donné, s'il est jouable
  maintenant et sinon pourquoi. C'est ce motif qui remplira les infobulles, donc
  il doit être une donnée et pas une chaîne construite dans un gabarit.

### ~~Lot 2~~ — L'éditeur de Big Shot *(fait)*

- `riffEditor()` rend, pour chaque riff coché, sa liste de paiements et sa liste
  d'effets, éditables. Ajouter, retirer, changer la ressource, changer la
  quantité.
- La correction d'une fausse note apparaît comme une ligne « règles de base »,
  au-dessus des deux familles de riffs, avec la même liste de paiements.
- Les riffs libres gagnent les mêmes deux listes, en plus de leur texte.
- Les quatre types de session du compendium sont renseignés — c'est là que la
  session filler cesse de mentir. Relire le pack depuis sa base pour prouver
  qu'il se recharge, comme la dernière fois.

### ~~Lot 3~~ — La boîte de jet *(fait)*

- Une section « Riffs ouverts », lue sur le **mouvement choisi dans le menu de la
  boîte**, pas sur celui de la prime. Elle doit donc se recomposer quand on
  change de mouvement, au même titre que le seuil et le compte de dés.
- Fermé à ce mouvement → absent. Ouvert mais impayable → grisé, motif en
  infobulle.
- Un riff est un bouton, pas une case : on le joue, l'effet entre dans l'aperçu
  du groupement, et il reste cliquable tant que l'état le permet. Une liste des
  riffs joués, chacun avec une croix pour le reprendre — rien n'est débité avant
  *Lancer*.
- Le coût total récapitulé au-dessus du bouton *Lancer*, qui vaut confirmation.
  Annuler ne coûte rien.
- **S'impliquer** : le paiement, et des dés.
- **Improviser** : le paiement, et un second menu d'approche dont les traits
  rejoignent la réserve. Le bonus de genre reste attaché à l'approche
  principale — sinon le riff devient un moyen d'acheter le dé de genre.
- **Montrer ses blessures** : le paiement, le désavantage, et une **seconde
  liste** — les traits entamés du chasseur, tous genres confondus. Elle n'existe
  nulle part : `prepareDicePool` filtre les traits entamés. Traits du MONO
  exclus, dommages sévères exclus. Effacés au lancer, avec le reste.
- **Assister / Jam !** : un menu déroulant nommant l'assistant, qui pose
  l'avantage. Aucun débit (ADR 0009).

### ~~Lot 4~~ — La carte *(fait)*

- Les riffs d'après le jet deviennent des boutons, avec confirmation avant
  débit.
- **Forcer** : deux fausses notes ajoutées, un carton gagné, sous la garde
  « pas déjà deux cartons ». Ses fausses notes sont corrigibles comme les
  autres — le plafond de deux corrections reste global au test.
- Les deux riffs de fausse note de Big Shot, réservés aux MJ, débitant le risque
  de la prime.
- Le rappel de l'assistance : qui, et ce qu'il doit.
- Quitte ou double **garde** son câblage en dur, contrairement au plan initial.
  Son prix est un trait misé, donc il faut désigner *lequel* : ça demande un
  bouton par trait, et non un bouton par paiement comme les autres riffs. Il est
  retiré de la liste générique pour ne pas apparaître deux fois. Son prix est
  éditable dans le type de session, mais rien ne le lit encore.

### ~~Lot 5~~ — La fiche *(fait)*

- **Solo !** : un bouton près du compteur de rythme. Un point de rythme, un
  carton du genre de la session, un drapeau « joué » jusqu'au prochain
  `resetSession()` — qui doit apprendre à l'effacer.
- Le riff n'est offert que s'il est ouvert au mouvement en cours de la prime
  active, comme les autres.

### Ce que le lot ne fait pas

- **Le groove de Jam !** — repris depuis par le lot « grooves », plus bas. Le
  livre dit que Jam ! confère l'avantage « et aussi son groove » ; l'[ADR 0010](./adr/0010-un-groove-pose-des-modulations.md)
  a tranché que c'est une règle qui passe, pas du matériel, et le lot 4 des
  grooves l'applique. Assister et Jam ! cessent donc d'être identiques.

  *Une version antérieure de cette ligne justifiait le renoncement par « le seul
  dé de groove du système est le bonus de genre ». C'était faux : un groove est
  une capacité nommée, pas un dé.*
- **Le désavantage de Big Shot** reste un badge, faute de pouvoir poser un
  désavantage dans une boîte qui appartient au joueur (ADR 0009).
- **Le carton de Solo ! dans une session sans genre.** Voir la dette « Le genre
  d'une prime est toujours renseigné », plus bas : une prime neuve est `rock`,
  donc Solo créditera un carton rock dans une filler. Le correctif est le genre
  « aucun », toujours hors périmètre. À faire avant ou en même temps si ça gêne
  à la table.

### À vérifier à une table

- Sur une session classique, cocher un riff sans rien régler : le prix du livre
  doit s'afficher tout seul.
- Ouvrir un type de session **écrit avant ce lot** : il se charge, et chaque
  riff coché montre le prix du livre.
- Passer une prime en session filler : le bouton *Cartouche* de la carte doit
  disparaître au profit du rythme, et S'impliquer aussi.
- Jouer S'impliquer deux fois de suite dans la même boîte, puis en reprendre un :
  le groupement et le coût annoncé doivent suivre dans les deux sens.
- Tomber à zéro cartouche en cours de réglage : le riff se grise avec son motif,
  il ne disparaît pas.
- Changer de mouvement dans le menu de la boîte : la liste des riffs doit
  changer avec lui.
- Annuler la boîte après avoir joué trois riffs : aucune ressource ne doit avoir
  bougé.
- Montrer ses blessures avec deux traits entamés dans deux genres différents :
  les deux sont réparés sur la fiche, et le jet part bien avec désavantage.
- Improviser vers l'approche du genre de la session : le bonus de genre ne doit
  **pas** s'ajouter.
- Forcer depuis zéro carton, puis recommencer : deux cartons, quatre fausses
  notes. Corriger ensuite : le plafond de deux corrections tient toujours.
- Un joueur ne doit voir ni les boutons de risque, ni les riffs de Big Shot.
- Solo ! deux fois dans la même session : le second doit être grisé. Après un
  `resetSession()`, il redevient jouable.
- Écrire un riff libre à un rythme et deux dés bonus, l'ouvrir au troisième
  mouvement, et le jouer.

## Le lot « grooves »

**Lots 1 à 5 écrits et compilés ; rien n'a tourné dans Foundry.** Le vocabulaire
est tenu par `npm test` — `test/grooves.mjs` couvre la normalisation, ce qu'une
substitution ouvre, quels tests une modulation vise et ce qui l'éteint, et
`test/groove-sheet.mjs` compile la feuille du groove, sa vignette et les deux
rappels. Tout le reste est à vérifier à une table : voir la liste en fin de
section.

Le lot 4 est tombé avec le lot 3 : le groove prêté passe par la même couture que
la substitution, et les séparer aurait demandé d'écrire deux fois le même appel.

Le vocabulaire et la décision : voir
l'[ADR 0010](./adr/0010-un-groove-pose-des-modulations.md) pour ce qu'un groove
porte et pourquoi l'ADR 0009 n'en est pas renversé, et le glossaire pour les
quatre termes — Groove, Substitution, Modulation, Portée.

Aujourd'hui `groove` est un champ texte libre du template `common`, affiché sur
la seule fiche de prime, et Assister et Jam ! sont strictement identiques. L'objet
du lot est de faire du groove un Item possédé, de jouer les huit que le
vocabulaire couvre, d'approcher les deux que ses primitives savent représenter
en partie, et de rappeler les vingt-trois autres au moment où ils peuvent
se déclencher.

Le compte, pour mémoire : **huit joués** — les cinq substitutions de chasseur,
plus Contrôle à distance, Raid spécial et Mission secrète — **deux approchés**
(Maître-artificier, Passe-partout) et **vingt-trois rappelés**. L'écart entre
« joué » et « rappelé » doit rester lisible dans le compendium lui-même.

### ~~Lot 1~~ — Le vocabulaire des grooves *(fait)*

Rien de visible ; tout le reste en dépend. Même découpage que le lot « riffs » :
le pur d'un côté, Foundry de l'autre.

- Les types dans `types.ts` : `Groove`, `Modulation`, `Substitution`, la portée
  (`test` | `mouvement` | `session`), le filtre d'approche (`all` | `genre` |
  `offGenre`), et le public déjà connu des riffs.
- Un module pur `rolls/grooveTerms.ts`, jumeau de `riffTerms.ts` : il n'importe
  rien, pas même `constants.ts`. Normalisation additive — un groove écrit sans
  portée vaut `test`, sans filtre vaut `all` — pour que rien n'ait jamais besoin
  d'une migration.
- Les fonctions pures que tout le reste appellera : les approches qu'un jeu de
  grooves ouvre pour une approche donnée ; les modulations qui visent un test,
  filtre appliqué ; ce qui survit à un changement de mouvement, à une fin de
  session, à une révélation de secret.
- `grooves.ts`, côté Foundry, jumeau de `riffs.ts` : lire le groove d'un acteur,
  les modulations en cours d'une prime, ce qu'un groove peut poser maintenant et
  sinon pourquoi. Ce motif doit être une donnée et non une chaîne construite dans
  un gabarit — même règle que pour les riffs.
- `test/grooves.mjs`, ajouté à `test:pure`.

### ~~Lot 2~~ — L'item et son éditeur *(fait)*

- Un type d'Item `groove` dans `template.json` : public, texte, paiements, une
  substitution, et une **liste** de modulations — *Maître-artificier* en pose deux
  d'un coup, donc ce n'est pas un objet unique.
- La feuille d'item réutilise les partiels de `riff-editor.hbs` pour les
  paiements et les effets : c'est le même vocabulaire, il ne doit pas être dessiné
  deux fois.
- Le dépôt sur une fiche de chasseur ou de prime. Un second dépôt **remplace** le
  premier, après confirmation — même geste que réappliquer un type de session sur
  une prime déjà garnie.
- Le champ `system.groove` quitte le template `common`. Aucune migration : un
  MONO et un vaisseau mère n'en ont jamais eu, et les mondes existants n'y ont
  rien noté.

### ~~Lot 3~~ — La substitution et le rappel *(fait)*

Le premier lot qui rend quelque chose jouable, et le seul qui ne dépende de rien
d'autre que du vocabulaire.

- `approaches()` dans la boîte de jet ajoute les approches ouvertes par le groove
  du lanceur. La couture existe déjà : Improviser l'alimente, et
  `prepareDicePool` envoie déjà les cinq approches.
- La garde du dé de genre : `genreBonus` reste `genre === category`. Utiliser ses
  traits de Rock sur un test de Blues ne fait pas du test un test de Rock — c'est
  la même garde qu'Improviser.
- Le rappel nommé, aux deux moments où un groove peut se déclencher : dans la
  boîte de jet (sept grooves) et sur la carte après le jet (les quatre autres).
  C'est ce qui donne une valeur aux vingt-cinq grooves que le moteur ne joue pas
  complètement.

### ~~Lot 4~~ — Le groove prêté *(fait)*

- Le menu qui nomme déjà l'assistant lit son groove et l'ajoute au test. La
  substitution prêtée ouvre les traits **du lanceur**, jamais ceux de
  l'assistant : c'est la seule lecture compatible avec l'ADR 0009, et elle est
  écrite dans l'ADR 0010.
- Le groove prêté est **gelé** dans l'état du test, comme les riffs joués : la
  liste des riffs *ouverts* se relit en direct, ce qui a été joué ne se reprend
  pas.
- La carte le nomme sous l'assistance, à côté de ce que l'assistant doit.
- C'est ici, et nulle part ailleurs, qu'Assister et Jam ! cessent d'être le même
  riff.

### ~~Lot 5~~ — Les modulations *(fait)*

- `system.modulations` sur la prime, et `sharedPrimeFields` s'enrichit d'autant :
  une modulation se lit sur les fiches de chasseur, donc elles doivent se
  redessiner quand elle change, comme pour le mouvement.
- Les boutons sur la fiche de prime, près du compteur de risque qui y est déjà.
  Un groove dont la modulation court se grise avec son motif et **ne prend rien** :
  c'est le motif `noEffect` que Forcer utilise déjà.
- Les trois extinctions : tout changement de mouvement — dans les deux sens —,
  `resetSession()`, et la bascule de `secret.revealed` pour les modulations qui
  portent le drapeau.
- La lecture : la boîte de jet applique les effets de phase `roll`, la carte ceux
  de phase `card`. `EFFECT_PHASE` range déjà les sept, il n'y a rien à décider.
- Le rappel nommé dans la boîte et sur la fiche de chasseur. Un compte de dés qui
  baisse sans rien dire est le défaut que le redessin des fiches corrigeait déjà.

### ~~Lot 6~~ — Le compendium des trente-trois *(fait)*

- Deux packs `grooves` (FR) et `grooves-en` (EN), à côté de
  `types-de-session`, chacun rangé dans deux dossiers et portant les onze
  grooves de chasseur et les vingt-deux de prime. Les deux bases sont générées
  depuis le même catalogue mécanique ; seule leur rédaction diffère. Le livre en compte bien
  trente-trois ; les anciens totaux trente-cinq/vingt-quatre de cette roadmap
  étaient une erreur de décompte, corrigée lors de la constitution du pack.
- Douze sont joués par le système, un est approché, un est partiellement joué et
  dix-neuf restent des rappels. Les exceptions de calcul simples vivent dans des
  règles activables sur le Groove ou dans sa modulation (ADR 0011).
- Relire le pack depuis sa base après compilation pour prouver qu'il se recharge,
  comme pour les types de session.

### Ce que le lot « grooves » ne fait pas

- **Les quatre grooves de chasseur qui demandent une action ou une géométrie.**
  Faute de grives (une adjacence hexagonale que la fiche ne modélise pas), Hors
  des sentiers battus (réécrire une face), Maître de la bidouille (relancer le dé
  écarté), Plan sur le long terme (un dé réservé d'un test à l'autre).
- **Les grooves de prime qui pilotent des cadrans** — Comme un pro, Enlèvement
  orbital, Roi de l'évasion, Ça passe ou ça casse, Une offre que vous ne pouvez
  pas refuser. Ce système ne dessine jamais un cadran (ADR 0001), et ce n'est pas
  ce lot qui rouvrira la question.
- **Les interdictions et compteurs hors calcul du score.** Regarde dans l'abîme
  interdit d'effacer un dommage et Menace planétaire compte les tests deux par
  deux. Le plancher de Maître-artificier et le résultat lu par Jusqu'au bout sont
  désormais des règles activables (ADR 0011).
- **Le rachat de Passe-partout** — « les CP peuvent annuler l'augmentation de
  difficulté en dépensant deux cartons » — n'a pas de forme : un effet que les
  joueurs peuvent racheter n'existe nulle part.

### ADR 0014 — Exceptions nommées *(implémenté)*

- Enlèvement orbital automatise les `1` après le signal manuel de clôture, sans
  piloter Sliced Dials.
- Plan sur le long terme réserve, affiche, consomme et solde un résultat de dé.
- Vengeance et Ombres transforment les paiements, dettes d'assistance comprises.
- Marchandises dangereuses ouvre une troisième correction par MONO ; sa
  destruction reste en Rappel.
- Plus c'est petit impose deux traits distincts et atomiques.
- Faute de grives reste explicitement reporté au lot qui réconciliera la
  géométrie PDF et la fiche Foundry.

Cette section supersède, pour ces six entrées, les exclusions historiques juste
au-dessus sans réécrire la trace de ce que le lot initial avait volontairement
laissé de côté.

### ADR 0015 — Offset de difficulté *(implémenté)*

La seconde destination des cartons du livre — « réduire de 1 la difficulté du
mouvement pour les prochains tests de la session » — n'existait pas. La prime
porte désormais un offset signé, et la difficulté d'un test vaut
`max(1, mouvement.difficulty + offset)`.

- Un carton dépensé sur la Carte le baisse de 1, une fausse note de Big Shot le
  monte de 1.
- Passe-partout le monte de 3 et ajoute un dé, à chaque test, cumulativement ;
  deux cartons du test le remettent à zéro. **Le rachat a donc une forme** —
  ceci supersède l'exclusion « Le rachat de Passe-partout » ci-dessus.
- Vue du dernier étage éteint le bouton carton ; jouer son Solo ! crédite un
  droit unique de réduction. `cartonAgainstDifficulty`, déclaré par l'ADR 0012 et
  jamais lu, cesse d'être une déclaration morte.
- La Carte doit figer la difficulté effective à son instantané : elle n'est plus
  une fonction pure du mouvement (ADR 0007).

### Corrections de moteur accompagnant ce lot *(implémenté)*

- Le paiement de plusieurs riffs au lancer est agrégé en une option unique,
  validée et débitée en un seul passage. Aujourd'hui la boucle sort en `return`
  à la première option impayable sans rembourser les précédentes.
- Le moteur honore `paymentOptions` sur les activations instantanées ; le prix en
  dur de Hors des sentiers battus disparaît, et `groovePlayOffer` facture la
  somme des activations payantes au lieu de la première.
- Assister cesse de prêter le groove de l'assistant : c'est propre à Jam !.
- `state.running` est calculé avec l'avantage, sans quoi les activations
  conditionnées `underDisadvantage` manquent à l'affichage et aux effets de carte.
- Maître de la bidouille devient une relance unique par test, acceptée ou refusée
  après affichage. Transformer un dé ne remet plus `corrected` à zéro : le
  plafond de deux corrections reste global au test.
- Le statut « joué / rappel » cesse d'être saisi dans les descriptions et se
  dérive des Activations, des Rappels et de l'appartenance à `BESPOKE_GROOVES` —
  sans quoi les six exceptions nommées, qui ont `activations: []`, dériveraient à
  tort en « Rappel uniquement ».

### Vérifier les grooves à une table

- Déposer un groove sur un chasseur, puis un second : la confirmation apparaît, et
  refuser ne doit rien écrire.
- Déposer un groove de prime sur un chasseur : le système doit le refuser, ou au
  minimum le dire.
- Loup solitaire sur Spike, test de Blues : ses traits de Rock apparaissent
  cochables, et le groupement **n'a pas** le dé de genre si la session est en rock.
- Le même test sans groove : les traits de Rock ne doivent pas apparaître.
- Jam ! d'un camarade portant Souvenir de guerre sur un test de Rock : ce sont les
  traits de Blues **du lanceur** qui s'ouvrent. Entamer l'un d'eux pour corriger
  doit écrire sur la fiche du lanceur, et sur aucune autre.
- Changer le groove de l'assistant après le jet : la carte doit continuer
  d'afficher celui qui a été prêté.
- Jouer Contrôle à distance : le risque part, la modulation s'affiche nommée sur
  les fiches de chasseur ouvertes **sans qu'on les ferme**, et les tests de
  l'approche du genre partent avec désavantage — les autres non.
- Recliquer le même groove : bouton grisé, motif en infobulle, et le risque **ne
  doit pas** bouger.
- Avancer le mouvement, puis revenir en arrière : la modulation doit s'éteindre au
  premier changement et ne pas revenir au second.
- Révéler le secret avec une modulation portant le drapeau, et une autre sans :
  la première s'éteint, la seconde tient.
- `resetSession()` avec deux modulations en cours : les deux partent, les grooves
  restent.
- Un joueur ne doit voir aucun bouton de groove sur la fiche de prime, mais doit
  voir les modulations en cours, nommées.
- Ouvrir un chasseur créé **avant** ce lot : rien ne doit manquer, et le champ
  texte disparu ne doit rien casser.
- Écrire un groove libre à deux modulations de portées différentes, le déposer sur
  une prime, et jouer les deux.

## Blocking, before this is playable again

### Vérifier les cartes de test à une table

Le calcul est tenu par `npm test`, mais rien de ce qui suit n'a tourné dans
Foundry. Il faut deux clients : Big Shot et un joueur.

- Un joueur lance depuis sa fiche. Big Shot voit la carte, et **ses boutons de
  correction sont actifs chez lui aussi** — c'est tout l'objet de l'ADR 0007.
- Big Shot entame un trait depuis sa carte : le trait se barre sur la fiche du
  joueur, la fausse note tombe, et la carte se met à jour **chez les deux sans
  changer de place** dans le log.
- Un troisième joueur voit les mêmes boutons, désactivés, avec « Ce test n'est
  pas le vôtre » en infobulle.
- Recharger la page (F5) au milieu d'une correction : la carte doit rester
  utilisable. C'est ce que l'ancien modèle perdait.
- Big Shot lance depuis la fiche d'un chasseur assigné à un joueur : la carte
  doit être écrite **au nom de ce joueur**, qui peut alors corriger.
- Trois corrections d'affilée : les boutons disparaissent après la deuxième, et
  la fausse note restante part chez Big Shot.
- *Annuler une fausse note* : le bouton n'apparaît que chez Big Shot, y compris
  sur une session qui ne lui ouvre aucun riff. Il retire une note par clic,
  disparaît à zéro, ne débite rien nulle part, et ne consomme aucune des deux
  corrections du chasseur — qui doit encore pouvoir corriger deux fois après.
- Quitte ou double : le bouton n'apparaît que si le riff est ouvert au mouvement
  en cours sur la prime active. Le retirer du type de session doit le faire
  disparaître des cartes suivantes.
- Miser un trait : les dés sont remplacés sur la même carte, le groupement vaut
  les traits utilisables + 1, et sans les deux cartons le trait est brisé sur la
  fiche. Remiser : le groupement ne doit pas enfler.
- Miser jusqu'à épuisement des traits : le bouton s'éteint.
- Vérifier que `message.rolls` réécrit sur une relance ne casse ni l'affichage
  Foundry ni un module de dés 3D.
- Une carte d'un ancien monde, antérieure au flag, ne doit plus montrer de
  boutons du tout.

### Vérifier les riffs à une table

Rien de ce qui suit n'a tourné dans Foundry — seulement compilé, et le pack a
été relu depuis sa base pour prouver qu'il se recharge. Sur un monde Cowboy
Bebop :

- Ouvrir le compendium « Types de session » : quatre entrées, chacune avec ses
  trois mouvements et sa mise en place.
- Sur une prime neuve, la section Riffs est vide et la fiche des chasseurs
  annonce qu'aucun riff n'est sur la table.
- Appliquer un type par le bouton, puis par glisser-déposer depuis le
  compendium. Vérifier que la mise en place s'affiche après l'application.
- Réappliquer un type sur une prime déjà garnie : la confirmation doit
  apparaître, et refuser doit ne rien écrire.
- Cocher, décocher, ajouter et supprimer un riff libre, des deux côtés
  (chasseurs et Big Shot).
- Rendre la prime active, ouvrir une fiche de chasseur : elle montre les riffs
  du mouvement en cours, du côté des chasseurs seulement.
- Changer le mouvement de la prime pendant qu'une fiche de chasseur est
  ouverte : elle doit se recomposer sans qu'on la ferme. Idem en changeant de
  prime active.
- Vérifier qu'un joueur ne voit pas les options de Big Shot sur sa fiche.

### Vérifier les MONO à une table

Rien de ce qui suit n'a tourné dans Foundry — seulement compilé. Sur un monde
Cowboy Bebop :

- Créer un acteur MONO : trois hexagones, le premier portant son nom. Écrire
  dedans depuis sa propre fiche.
- Le déposer sur une fiche de chasseur : les trois hexagones y apparaissent et
  s'y modifient, renommage compris. Renommer le premier depuis la fiche du
  chasseur doit renommer l'acteur, donc son pion.
- Lancer les dés sur n'importe quel genre : les traits du MONO doivent
  apparaître dans la réserve, quel que soit le genre choisi, sous ceux du
  chasseur.
- Cocher un trait de MONO et un trait de chasseur, puis produire une fausse
  note. Sur la carte, les boutons du trait de chasseur doivent être grisés, avec
  le motif en infobulle ; ceux du MONO actifs. Entamer le trait du MONO, puis
  vérifier que la carte réécrite débloque le chasseur.
- Vérifier qu'entamer et briser touchent bien le MONO et non le chasseur, et
  qu'un homonyme entre les deux fiches ne trompe pas le bouton.
- Entamer les trois traits du MONO : la carte « hors course » doit tomber une
  seule fois, et le MONO cesser d'apporter des dés. Réparer puis réentamer doit
  la redire.
- Réparer un trait entamé depuis la fiche ; vérifier qu'un trait brisé n'offre
  pas de bouton, et que la remise à neuf du MONO le rend — sans toucher aux
  traits du chasseur, ni l'inverse.
- Détacher le MONO : l'acteur doit survivre, la fiche du chasseur redevenir
  vide.
- Poser un MONO sur une scène et vérifier que son pion porte bien son nom.
- Sur une prime, déposer un MONO : le bloc n'apparaît que pour Big Shot et
  n'affiche aucun trait.
- Créer un vaisseau mère : trois descripteurs avec approche et signification,
  aucun dé nulle part.
- Ouvrir un chasseur créé **avant** ce lot : ses traits entamés et brisés
  doivent avoir survécu au renommage `damaged`/`hyperdamaged` →
  `dented`/`broken`.

### Verify the dials at a table

Nothing below matters until this is done. On a Cowboy Bebop world with Sliced
Dials enabled:

- Create a prime, add an objective dial and a threat dial from its sheet.
- Check the dials appear on the sheet and in the module's panel.
- Make that prime active, roll from a hunter, then collect from the active GM's
  chat card. Check cartons land on the hunter, false notes on the prime, and the
  card turns into its settled account - who received what - with the collect
  button gone for everyone so it cannot be collected twice.
- On both an objective and a threat, check the GM can choose between a positive
  carton from a hunter and a negative false note from the prime. Check each
  selected pool drops by one.
- Empty a pool and check the genre is greyed out with a reason rather than
  failing after the click.
- Fill a dial and check it locks and announces its composition in chat.
- Check a player who is not an owner of the dial cannot place anything, and a
  player can spend only cartons belonging to a hunter they own.
- Correct cartons from a hunter sheet and check their named row appears on the
  prime sheet while its aggregate totals update by genre.
- Add a carton to the prime's bonus reserve, spend it on a linked dial as GM,
  and check players are not offered that reserve.
- Activate another prime and check the combat tracker shows only that prime's
  active dials, never prepared, hidden, unlinked or previous-prime dials.
- Link an existing world dial to the prime, then unlink it again.

### The toolchain is lying

`package.json` still pins `foundry-vtt-types@^9` and TypeScript 4.8, while the
manifest declares v13–v14. It compiles, and the API being called is the modern
one, but the types describe a Foundry that no longer exists — so they are
checking nothing useful and will hide real breakage.

Upgrade to `^13.341` and TypeScript 5.6, matching `not-the-end`. Expect a wall
of errors: the existing sheets, roll dialog and actor document were written
against v9 typings.

This was deliberately kept out of the dials work rather than riding along with
a feature.

## Known debt, in rough order of risk

### ApplicationV1 sheets

`ActorSheet` and `ItemSheet` are deprecated since v13 and will be removed. The
sheets need porting to `ApplicationV2`. Sliced Dials is already ApplicationV2
throughout, so `mountDials` works either way — this is not blocked by the module.

### template.json instead of DataModels

Foundry v14 still reads `template.json` (`game.model` documents it), so this is
not urgent. It is the direction every other system in this collection has taken,
and it buys real validation.

### Le genre d'une prime est toujours renseigné

`template.json` donne `"genre": "rock"` à toute prime neuve, et
[`testState.ts`](../src/ts/rolls/testState.ts) ajoute un dé
quand l'approche du chasseur égale ce genre. Une prime dont personne n'a choisi
le genre offre donc un dé gratuit aux jets de rock — et le livre dit qu'une
session filler n'a pas de genre du tout.

Le correctif est un genre « aucun » : une option vide dans la liste déroulante,
et pas de bonus quand elle est choisie. Écarté du lot « riffs » à dessein : Big
Shot ajuste à la main en attendant.

### La Poursuite n'est pas modélisée

Le livre en fait un objet réglé (chapitre 2, page 36) et le MONO s'y réfère :
ses traits encaissent en premier « si un vaisseau personnel est engagé dans une
poursuite ». Rien ici ne l'ouvre ni ne la ferme. Le système se contente donc de
signaler le moment où un MONO tombe, et la priorité de dégât s'applique dès
qu'un trait de MONO est mis dans la réserve — ce qui est une approximation
assumée de l'engagement. Inscrite au glossaire comme non modélisée, à l'image
du Risque.

### Dead vocabulary

`isImportant` and `mouvement` were dropped from dials. If either mattered at the
table, decide whether it comes back as a category, a dial name convention, or
not at all.

## Housekeeping

- The work is on `feat/sliced-dials`; merge once the table check above passes.
- `package.json` is still named `foundry-module-ts` and described as a template.
- The repo predates the dual-mode build template; consider rebasing onto it for
  the release pipeline the other systems now have.
