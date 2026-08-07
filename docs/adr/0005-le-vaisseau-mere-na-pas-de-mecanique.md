# 0005 — Le vaisseau mère n'a délibérément aucune mécanique

**Status:** accepted

## Context

Le vaisseau mère est le vaisseau de l'équipage. Le livre le fait construire par
un tableau à trois colonnes — style, caractéristique externe, caractéristique
interne — dont chaque entrée porte une **approche** (« Approche : tango »,
« Approche : blues »), un **thème** ou un **ton**, et un nom suggéré.

L'approche emploie exactement le vocabulaire des genres du système. La tentation
est donc forte d'en faire des traits : trois descripteurs, trois genres, trois
dés.

Le livre, lui, ne lui donne ni dégâts ni dés. Il consacre une page entière aux
deux règles du MONO, et pas une ligne à celles du vaisseau mère.

## Decision

Le vaisseau mère est un type d'**Actor** dont la fiche ne porte que de la
fiction : un nom, un concept, et trois descripteurs faits d'un intitulé, d'une
approche et de ce qu'il signifie. Aucun dé, aucune piste de dégâts.

Il n'est désigné par aucun réglage de monde : c'est la possession Foundry qui le
partage, comme n'importe quel document que Big Shot ouvre à sa table.

## Considered Options

**Traits comme un MONO** — trois descripteurs endommageables qui donnent des dés.
Écarté : ils seraient partagés par tout l'équipage et disponibles dans tous les
genres, soit trois dés permanents pour chaque chasseur, sans contrepartie ni
piste pour les brûler. L'économie de cartons et de fausses notes est équilibrée
serré ; c'est le genre d'ajout qui la décale entièrement.

**Un dé par descripteur, sans dégâts** — même problème, en pire : le bonus est
permanent et rien ne peut le retirer.

**Un réglage de monde « vaisseau mère actif »**, comme la prime active. Écarté :
la prime active existe parce que *les jets ont besoin de la trouver*. Rien ne
cherche le vaisseau mère, et un réglage unique interdirait deux équipages dans
le même monde.

## Consequences

- Un lecteur qui ouvre cette fiche y verra beaucoup de texte et aucun bouton.
  C'est voulu. Ne pas « compléter » cette fiche avec des dés sans en reparler.
- Les deux types de vaisseau ne partagent aucun gabarit propre : après ces
  décisions, il ne leur restait en commun que `name`, que Foundry fournit déjà.
  Ils réutilisent le gabarit `common` du système, comme chasseur et prime.
- Les tableaux 2d6 du livre ne sont pas modélisés. La fiche s'en inspire par ses
  seuls textes d'aide ; un générateur aléatoire reste possible plus tard, et
  n'aurait rien à changer au modèle.
