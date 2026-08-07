# 0009 — On n'écrit que sur la fiche qu'on joue

**Status:** accepted

## Contexte

Quatre riffs du livre agissent sur le test de quelqu'un d'autre, ou avant qu'il
ait lieu.

- **Assister** : un chasseur dépense un point de rythme pour conférer l'avantage
  au test d'un camarade, puis efface un dommage sur l'un de ses propres traits.
- **Jam !** : la même chose en mieux, au troisième mouvement.
- **Désavantage de Big Shot** : un risque dépensé pour désavantager un jet.
- **Solo !** : joué « avant ou après un test », « même s'il n'intervient pas
  dans le test ».

Les trois premiers butent sur deux murs à la fois.

**Le temps.** L'avantage se fixe au lancer : un dé de plus, le plus bas écarté.
Il n'existe aucun moyen de l'appliquer après coup sans relancer. L'assistant doit
donc agir *avant* que son camarade lance — or la boîte de jet est locale au
client du lanceur.

**Les droits.** Le client de A ne peut pas écrire sur la fiche de B. C'est
exactement le mur que l'[ADR 0002](./0002-currencies-follow-their-owners.md) a
déjà rencontré pour les fausses notes, et que `payersFor` documente : Foundry
accepterait le geste et refuserait le débit ensuite.

Un troisième chemin existait : faire relayer l'écriture par le client de Big
Shot, qui possède tout le monde. L'[ADR 0007](./0007-un-test-vit-sur-sa-carte.md)
l'a écarté pour les corrections, en alignant le droit de cliquer sur le droit
d'écrire, précisément pour n'avoir aucun relais à tenir.

## Décision

**Le système n'écrit jamais sur une fiche que le cliqueur ne possède pas.** Un
riff qui coûte à quelqu'un d'autre est enregistré et rappelé, jamais débité.

- Assister et Jam ! prennent la forme d'un **menu déroulant nommant
  l'assistant**, dans la boîte de jet du lanceur. Le choix pose l'avantage tout
  de suite et voyage sur la carte, qui affiche « assisté par X » et ce que X
  doit. X retire son rythme lui-même, sur sa propre fiche.
- Le riff de désavantage de Big Shot reste un badge, pour la même raison de
  temps : il s'annonce à voix haute et le joueur choisit dans son menu.
- Les deux riffs de fausse note de Big Shot **sont** débités, eux : le risque
  vit sur la prime, que Big Shot possède, et ils agissent après le jet. Le mur
  n'existe pas pour eux.
- Solo ! vit sur la fiche du chasseur, pas sur une carte : le chasseur y débite
  son propre rythme et s'y crédite son carton.

## Options écartées

**Régler l'assistance à la collecte.** Big Shot collecte déjà, après résolution,
en écrivant sur des acteurs que le lanceur ne possède pas ; et le livre place la
contrepartie de l'assistance « à la fin du test ». Les deux moments coïncident,
et c'était séduisant. Écarté : le rythme de l'assistant partirait sans qu'il ait
cliqué quoi que ce soit, et une règle « le système n'écrit que chez soi » vaut
mieux qu'une exception bien placée.

**Une offre préalable de l'assistant.** L'assistant clique sur sa propre fiche,
son rythme part, une offre en attente est posée, la boîte de jet du camarade la
ramasse. Le seul chemin qui respecte à la fois le consentement et les droits.
Écarté : il faut inventer un cycle de vie pour l'offre — quand elle expire, ce
qu'il advient si personne ne la consomme, qui rembourse — pour un riff qu'une
phrase à voix haute règle déjà à la table.

**Un relais par socket ou par le MJ actif.** Écarté par l'ADR 0007, qui a
supprimé les deux et n'a pas de raison de les rouvrir pour ce cas.

## Conséquences

- Un chasseur peut être nommé assistant sans avoir consenti, et peut oublier de
  payer. C'est assumé : la carte le rappelle, la table le voit passer dans le
  chat.
- Le glossaire cesse de dire que rien ne débite le Risque — deux riffs le font
  désormais. La règle qui reste vraie n'est pas « le Risque ne bouge pas seul »,
  c'est « on n'écrit que chez soi », et elle est plus large.
- « Conférer son groove » (Jam !) n'est pas modélisé. Le menu nomme déjà
  l'assistant, donc l'information nécessaire est là quand la règle sera tranchée.
  D'ici là, Jam ! se comporte comme Assister.
- Le drapeau « solo joué » d'un chasseur vit sur sa fiche et se remet à zéro avec
  le reste de l'économie de session.
