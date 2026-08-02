# 0003 — La prime copie son type de session

**Status:** accepted

## Context

Les riffs sont les actions de gameplay ouvertes à un chasseur pendant un test.
Lesquels sont sur la table ne dépend pas du personnage mais de la partie jouée :
le livre appelle cela un **type de session**, et il varie de session en session
comme il varie de mouvement en mouvement.

Un type de session est donc un objet réutilisable — une table qui joue vingt
enquêtes ne recoche pas vingt fois la même liste. Reste à décider ce qu'une
prime en garde. L'[ADR 0002](./0002-currencies-follow-their-owners.md) vient
d'établir le contraire pour les cadrans : Items du monde, reliés à la prime par
un flag, jamais copiés.

## Decision

Appliquer un type de session **copie** ses trois listes dans la prime, puis
oublie le lien. La prime est ensuite maîtresse chez elle : cocher, décocher,
ajouter un riff libre sont des écritures locales. Seul le *nom* du type appliqué
est retenu, en clair, à titre indicatif.

## Considered Options

**Lien + surcouche** — la prime désigne un type et ne stocke que ses écarts.
Corriger un type mettrait à jour toutes les primes qui l'utilisent. Écarté :
deux sources à fusionner à chaque lecture, et une prime dont le type a été
supprimé ou laissé en compendium n'a plus rien à lire.

**Lien pur** — tout se configure sur le type. Écarté : tordre une seule session
imposerait de dupliquer un type entier.

## Consequences

- Les riffs ne suivent pas le motif des cadrans, et c'est délibéré. Un cadran est
  un état partagé qui vit pendant la partie ; un type de session est une
  configuration de départ. Ce qui vit se relie, ce qui amorce se copie.
- Corriger un type de session ne remonte pas dans les primes déjà préparées. En
  échange, une session jouée garde pour toujours la table qu'elle avait.
- Appliquer un type écrase les listes existantes, riffs libres compris. La fiche
  demande confirmation quand la prime n'est pas vierge.
- Une prime neuve n'a aucun riff : Big Shot applique un type. Tant qu'il ne l'a
  pas fait, la fiche des chasseurs le dit plutôt que d'inventer une liste par
  défaut.
- Le catalogue des riffs du livre reste dans le code — un identifiant, un rappel
  traduit, et le public visé (chasseur ou Big Shot). Il ne déclare aucune
  disponibilité par mouvement : cette vérité-là appartient aux types de session,
  et à eux seuls.
- **Un type de session porte trois listes indépendantes, une par mouvement, et
  non un mouvement d'ouverture par riff.** Le livre dit les riffs cumulatifs —
  « vous ne perdez jamais la possibilité de plaquer ces riffs » — et un mouvement
  d'ouverture porterait cette règle dans le modèle. Le choix inverse est
  délibéré : il laisse écrire des types de session que le livre n'a pas prévus,
  ce que le livre réclame lui-même pour les sessions filler. Le prix est que la
  cohérence du cumul repose sur Big Shot, pas sur le code. Ne pas « corriger »
  ça sans en reparler.
- Les types de session sont livrés dans un compendium **du système**, pas d'un
  module de contenu séparé : un `sessionType` n'existe pas sans le système qui
  déclare son type, et un module optionnel laisserait un monde neuf sans rien.
