# 0006 — Les traits d'un MONO n'ont pas de genre

**Status:** accepted

## Context

Partout ailleurs dans ce système, un trait est rangé sous un genre. La réserve
de dés se construit par genre : on clique sur « rock » et l'on obtient les
traits rock du chasseur. C'est le squelette de la fiche et du jet.

Le livre range les traits d'un MONO nulle part, et le dit explicitement :

> Vous pouvez utiliser ces traits si vous vous servez de votre MONO, **quelle
> que soit la situation**

C'est ce qui rend un MONO désirable : il élargit la palette au lieu de creuser
une colonne. Les ranger sous un genre reviendrait à en faire trois traits de
chasseur de plus.

## Decision

Un trait de MONO n'a pas de genre. Les trois se proposent à **tous** les jets de
leur pilote, dans un groupe distinct sous les traits du chasseur.

Le terme *Trait* du glossaire est élargi en conséquence : une phrase qui ajoute
un dé tant qu'elle n'est ni entamée ni brisée, celles d'un chasseur étant rangées
sous un genre et celles d'un MONO servant partout.

## Considered Options

**Un genre par trait de MONO** — homogène avec le reste, gratuit à écrire.
Écarté : efface ce que le chapitre essaie de dire, et rend un MONO strictement
équivalent à trois traits de plus.

**Hors réserve, purement narratifs** — Big Shot accorde un bonus à la main.
Écarté : le livre en fait des traits, avec les mêmes deux degrés d'usure, et la
priorité de dégât n'aurait plus rien sur quoi porter.

**Inventer un mot** — « équipement », « module ». Écarté : s'écarte du livre et
oblige à traduire à chaque lecture de règle.

## Consequences

- **`traitsUsed` porte sa provenance et non plus un simple nom.** Tant que la
  réserve ne contenait que les traits d'un chasseur, un nom suffisait à
  désigner un trait. Depuis que ceux d'un MONO cohabitent avec eux, deux
  homonymes seraient indiscernables — et c'est précisément ce que la priorité de
  dégât doit distinguer. Chaque trait de la réserve porte donc une clef
  (`hunter:<genre>:<index>` ou `mono:<index>`), et c'est elle qui circule
  jusqu'aux boutons de la carte de chat.
- **La priorité de dégât se calcule au rendu de la carte, pas à l'écriture.**
  Le livre veut que les traits du MONO soient brûlés avant ceux du chasseur ;
  les boutons de ces derniers sont donc désactivés, avec leur motif, tant qu'un
  trait de MONO reste dans `traitsUsed`. Cela fonctionne parce que la carte est
  réécrite après chaque dégât et qu'un trait dépensé quitte la liste : la carte
  suivante rouvre d'elle-même ce que la précédente fermait.
- Cocher un trait de MONO *est* la déclaration qu'on se sert de son appareil. Il
  n'y a donc pas de drapeau « engagé » séparé : s'il n'y a aucun trait de MONO
  dans la réserve, il n'y a rien à protéger.
- Un MONO dont les trois traits sont entamés cesse de lui-même d'alimenter la
  réserve. La carte « hors course » ne bloque donc rien : elle signale un moment
  et passe la main à la joueuse, faute de Poursuite modélisée à quitter.
