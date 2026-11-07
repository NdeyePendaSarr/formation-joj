# PRD — Bénévoles

**Statut** : Validé

## Problème

Chaque discipline a besoin de bénévoles pour accueillir le public. Les responsables de discipline gèrent aujourd'hui les inscriptions sur papier, et des créneaux débordent : plus de bénévoles inscrits que de places prévues.

## Utilisateurs

- Responsable de discipline : ouvrir des créneaux d'accueil pour sa discipline, avec un nombre de places.
- Bénévole : s'inscrire à un créneau, et s'en désinscrire s'il ne peut plus venir.

## Proposition

Le responsable ouvre un créneau avec une capacité ; les bénévoles s'y inscrivent ; l'application refuse toute inscription au-delà de la capacité. Un créneau appartient à une discipline existante, avec un début, une fin après le début, et une capacité d'au moins 1. N'importe qui peut ouvrir un créneau, les comptes étant hors périmètre.

## Mesure du succès

- Pendant la démo, un créneau de capacité 2 accepte deux bénévoles et refuse le troisième.
- TR2 : consulter un créneau montre ses places restantes et ses inscrits dans l'ordre ; un même email (sans tenir compte des majuscules) est refusé : déjà inscrit.
- TR3 : se désinscrire libère la place ; désinscrire un email non inscrit est refusé : pas inscrit.

## Tranches

### TR1 — Ouvrir un créneau et s'y inscrire

Le responsable ouvre un créneau avec une capacité ; un bénévole s'y inscrit. Règle : jamais plus d'inscrits que la capacité.

### TR2 — Consulter un créneau et ses inscrits

On consulte un créneau et la liste de ses inscrits. Règle : un même email ne s'inscrit pas deux fois au même créneau.

### TR3 — Se désinscrire, et l'écran du créneau

Un bénévole se désinscrit d'un créneau, ce qui libère sa place. Un écran permet de voir un créneau, de s'y inscrire et de s'en désinscrire.

## Hors périmètre

- La modification ou la suppression d'un créneau.
- Les emails de confirmation.
- Les comptes des bénévoles.

## Hypothèses et risques

- Hypothèse : un bénévole s'identifie par son nom et son email, sans compte.
- Risque connu, accepté pour la démo : n'importe qui peut désinscrire un autre bénévole en connaissant son email.
- Risque : sans écran avant TR3, les tranches 1 et 2 ne se démontrent que par l'API.
