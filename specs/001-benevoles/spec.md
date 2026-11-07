# 001 — Bénévoles

**Statut** : Validée
**PRD** : specs/prd-benevoles.md, TR1

## Contexte

Les responsables de discipline gèrent les inscriptions des bénévoles d'accueil sur papier, et des créneaux débordent. Cette première tranche permet d'ouvrir un créneau avec un nombre de places et de s'y inscrire, sans jamais dépasser ce nombre. Elle se démontre par l'API seule : l'écran viendra en TR3.

## User stories

- En tant que responsable de discipline, je veux ouvrir un créneau d'accueil avec un nombre de places pour une discipline, afin de prévoir l'accueil du public.
- En tant que bénévole, je veux m'inscrire à un créneau, afin d'y tenir une place, et savoir tout de suite combien il en reste ou s'il est complet.

## Scénarios d'acceptation

### AS1 — Ouvrir un créneau

- **Étant donné** la discipline « Lutte » · **Quand** le responsable ouvre un créneau le 2 novembre 2026 de 9 h à 12 h, de capacité 2 · **Alors** le créneau est enregistré avec sa discipline, son début, sa fin et sa capacité, sans aucun inscrit. Un créneau dans le passé, ou qui chevauche un autre créneau de la même discipline, est accepté de la même façon.

### AS2 — Fin qui ne suit pas le début

- **Étant donné** une fin égale au début (de 9 h à 9 h) ou antérieure au début (de 12 h à 9 h) · **Quand** le responsable ouvre le créneau · **Alors** c'est refusé dans les deux cas, la réponse dit pourquoi, et aucun créneau n'est enregistré.

### AS3 — Capacité inférieure à 1

- **Étant donné** une capacité de 0, négative ou non entière · **Quand** le responsable ouvre le créneau · **Alors** c'est refusé, et aucun créneau n'est enregistré.

### AS4 — Discipline inconnue

- **Étant donné** une discipline qui n'existe pas · **Quand** le responsable ouvre un créneau pour elle · **Alors** l'application dit que la discipline est introuvable, et aucun créneau n'est enregistré.

### AS5 — S'inscrire à un créneau

- **Étant donné** le créneau de Lutte du 2 novembre 2026 de 9 h à 12 h, de capacité 2, sans inscrit · **Quand** Awa s'y inscrit · **Alors** c'est accepté : son inscription est enregistrée avec son nom et son email, et la réponse montre qu'il reste 1 place.

### AS6 — Prendre la dernière place

- **Étant donné** ce même créneau, où Awa est inscrite · **Quand** Moussa s'y inscrit · **Alors** c'est accepté, sans refus, et la réponse montre qu'il reste 0 place.

### AS7 — Créneau complet

- **Étant donné** ce même créneau, où Awa et Moussa sont inscrits · **Quand** Fatou essaie de s'y inscrire · **Alors** refus 409, code SLOT_FULL, et le créneau compte toujours 2 inscrits. Si deux bénévoles demandent la dernière place en même temps, un seul est inscrit ; l'autre reçoit ce même refus.

### AS8 — Nom ou email invalide

- **Étant donné** un nom vide, fait d'espaces ou de plus de 100 caractères, ou un email mal formé · **Quand** le bénévole s'inscrit · **Alors** c'est refusé, la réponse dit pourquoi, et rien n'est enregistré.

### AS9 — Créneau inconnu

- **Étant donné** un créneau qui n'existe pas · **Quand** un bénévole s'y inscrit · **Alors** l'application dit que le créneau est introuvable.

## Hors périmètre

- Consulter un créneau et ses inscrits, et le refus d'un même email deux fois (TR2).
- Se désinscrire, et tout écran (TR3).
- Modifier ou supprimer un créneau, les emails de confirmation, les comptes.

## Questions ouvertes

- Aucune : les hypothèses de concurrence, de longueur du nom et de créneaux passés ou chevauchants sont confirmées et intégrées aux scénarios (AS1, AS7, AS8).
