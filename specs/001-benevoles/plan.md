# 001 — Bénévoles : plan

**Statut** : Validé

## 1. Résumé

On construit, côté API seulement, l'ouverture d'un créneau d'accueil pour une discipline existante et l'inscription d'un bénévole sur ce créneau. Une fois les tâches terminées, un appelant de l'API peut ouvrir un créneau avec un début, une fin et une capacité, puis y inscrire des bénévoles : chaque réponse d'inscription donne le nombre de places restantes, et une inscription sur un créneau complet est refusée avec le statut 409 et le code `SLOT_FULL`, y compris quand deux demandes arrivent en même temps sur la dernière place. Le travail est découpé en six tâches, dans l'ordre des couches : le domaine (deux tâches), les cas d'usage (deux tâches), la base de données, puis les routes HTTP et leurs tests de bout en bout. La consultation d'un créneau, le refus d'un même email deux fois, la désinscription, la fausse API du front et tout écran sont laissés aux tranches TR2 et TR3.

Les mots de la spec et leur nom dans le code :

| Dans la spec          | Dans le code         | Ce que c'est                                                                      |
| --------------------- | -------------------- | --------------------------------------------------------------------------------- |
| Bénévoles (le module) | module `volunteers`  | Le dossier `apps/api/src/modules/volunteers/` qui regroupe toute la tranche.      |
| créneau               | `Slot`               | Une plage horaire d'accueil d'une discipline, avec un nombre de places.           |
| début, fin            | `startsAt`, `endsAt` | Les deux instants du créneau, en date et heure ISO 8601 avec fuseau.              |
| capacité              | `capacity`           | Le nombre maximal d'inscrits du créneau, entier d'au moins 1.                     |
| inscrits (le nombre)  | `registeredCount`    | Le nombre de bénévoles déjà inscrits sur le créneau.                              |
| places restantes      | `remainingPlaces`    | `capacity - registeredCount`, renvoyé dans la réponse d'inscription.              |
| inscription           | `Registration`       | Un bénévole inscrit sur un créneau : son nom, son email et sa date d'inscription. |
| ouvrir un créneau     | `OpenSlot`           | Le cas d'usage qui crée un créneau.                                               |
| inscrire un bénévole  | `RegisterVolunteer`  | Le cas d'usage qui inscrit un bénévole sur un créneau.                            |
| discipline existante  | `DisciplineLookup`   | Le port qui répond à la question « cette discipline existe-t-elle ? ».            |

## 2. Fichiers par couche

On crée le module `volunteers`, organisé comme le module Disciplines : un dossier par couche (`domain/`, `application/`, `infra/`, `http/`). Le module Disciplines n'est pas modifié.

- **shared** :
  - `packages/shared/src/volunteers.ts` contient les schémas Zod échangés avec l'API : `openSlotSchema` (identifiant de discipline, début, fin, capacité entière d'au moins 1, avec un `refine` qui refuse une fin qui ne suit pas strictement le début), `registerVolunteerSchema` (nom de 1 à 100 caractères après suppression des espaces, email bien formé), `slotIdParamsSchema`, `slotSchema` et `registrationSchema` pour les réponses, et la constante `VOLUNTEER_NAME_MAX_LENGTH = 100`.
  - `packages/shared/src/index.ts` exporte ce nouveau fichier.
- **domain** :
  - `domain/volunteers.errors.ts` définit `VolunteerError` (une `AppError`) avec ses codes, et les fabriques `slotFull()`, `slotNotFound()` et `slotDisciplineNotFound()`.
  - `domain/slot.ts` définit l'entité `Slot` : `create()` vérifie que la fin suit le début et que la capacité est un entier d'au moins 1, `restore()` relit la base, `register()` refuse un créneau complet puis renvoie la nouvelle `Registration` et augmente `registeredCount`, et le getter `remainingPlaces` calcule les places restantes.
  - `domain/registration.ts` définit l'entité `Registration` : `create()` supprime les espaces autour du nom, refuse un nom vide ou de plus de 100 caractères et un email mal formé ; `restore()` relit la base.
- **application** :
  - `application/slot.repository.ts` est le port `SlotRepository` : `findById()`, `insert()` et `addRegistration()`, qui enregistre une inscription et lève `SLOT_FULL` si le créneau s'est rempli entre-temps.
  - `application/discipline-lookup.ts` est le port `DisciplineLookup`, avec une seule méthode `exists(disciplineId)`.
  - `application/testing/in-memory-slot.repository.ts` et `application/testing/in-memory-discipline-lookup.ts` sont leurs implémentations en mémoire pour les tests ; la première refuse elle aussi d'ajouter une inscription au-delà de la capacité, comme la base.
  - `application/use-cases/open-slot.ts` (`OpenSlot`) vérifie que la discipline existe, crée le `Slot` et l'enregistre.
  - `application/use-cases/register-volunteer.ts` (`RegisterVolunteer`) charge le créneau, appelle `slot.register()`, enregistre l'inscription et renvoie l'inscription avec le créneau mis à jour.
- **infra** :
  - `infra/volunteers.schema.ts` déclare les tables `slots` et `registrations` (section 3).
  - `infra/slot.mapper.ts` contient `toDomain()` et `toRow()` pour le créneau et pour l'inscription.
  - `infra/drizzle-slot.repository.ts` (`DrizzleSlotRepository`) implémente `SlotRepository`. `addRegistration()` fait deux écritures dans une seule transaction (`db.transaction()`) : il augmente `registered_count` seulement si `registered_count < capacity`, lève `SLOT_FULL` si aucune ligne n'a été modifiée, puis insère l'inscription. Si l'insertion échoue, la transaction est annulée et l'incrément avec elle : un échec ne fait jamais perdre une place.
  - `infra/drizzle-discipline-lookup.ts` (`DrizzleDisciplineLookup`) implémente `DisciplineLookup` en lisant la table `disciplines` du module Disciplines.
- **http** :
  - `http/slots.controller.ts` (`SlotsController`) déclare deux routes :
    - `POST /api/creneaux` ouvre un créneau et renvoie 201 avec le créneau : `id`, `disciplineId`, `startsAt`, `endsAt`, `capacity`, `registeredCount` (0).
    - `POST /api/creneaux/:id/inscriptions` inscrit un bénévole et renvoie 201 avec l'inscription : `id`, `slotId`, `name`, `email`, `registeredAt`, `remainingPlaces`.
  - `volunteers.module.ts` (`VolunteersModule`) relie les deux ports à leurs implémentations Drizzle et déclare les cas d'usage ; il est ajouté aux `imports` de `apps/api/src/app.module.ts`.
- **web** : rien. L'écran et la fausse API viendront avec TR3.

## 3. Données

On stocke les créneaux et les inscriptions dans deux nouvelles tables. La migration est générée par `pnpm db:generate --name=create_slots_and_registrations` à partir de `infra/volunteers.schema.ts`, et jamais écrite ni retouchée à la main.

- **`slots`** : `id` (uuid, clé primaire), `discipline_id` (uuid, non nul), `starts_at` et `ends_at` (timestamptz, précision milliseconde, non nuls), `capacity` (integer, non nul), `registered_count` (integer, non nul, 0 par défaut).
  - La contrainte `slots_period_check` (`ends_at > starts_at`) protège AS2.
  - La contrainte `slots_capacity_check` (`capacity >= 1`) protège AS3.
  - La contrainte `slots_registered_count_check` (`registered_count BETWEEN 0 AND capacity`) protège AS7 : même si deux inscriptions passent en même temps, la base ne laisse jamais plus d'inscrits que de places.
  - `discipline_id` n'a pas de clé étrangère vers `disciplines` : supprimer une discipline qui a des créneaux échouerait sinon, et ce cas n'est pas dans la spec. L'existence de la discipline est vérifiée par `OpenSlot` (AS4).
  - **Dette connue** : sans cette clé étrangère, supprimer une discipline laisse ses créneaux orphelins, rattachés à un identifiant qui n'existe plus. Il faudra trancher (refuser la suppression, ou supprimer les créneaux avec elle) quand une spec traitera ce cas.
- **`registrations`** : `id` (uuid, clé primaire), `slot_id` (uuid, non nul, clé étrangère vers `slots.id`), `name` (varchar 100, non nul), `email` (text, non nul), `registered_at` (timestamptz, précision milliseconde, non nul). La clé étrangère garantit qu'une inscription appartient à un créneau existant (AS9).

## 4. Erreurs

Chaque refus de la spec devient une erreur métier (`AppError`), avec un code stable et un statut HTTP. Les entrées mal formées sont d'abord refusées par le schéma Zod partagé, avec le code générique `VALIDATION_FAILED` (400) ; le domaine revérifie ses règles avec ses propres codes.

| Code AppError               | Catégorie  | HTTP | Quand                                                   | Scénario |
| --------------------------- | ---------- | ---- | ------------------------------------------------------- | -------- |
| `SLOT_END_NOT_AFTER_START`  | VALIDATION | 400  | La fin du créneau est égale ou antérieure à son début.  | AS2      |
| `SLOT_CAPACITY_INVALID`     | VALIDATION | 400  | La capacité est inférieure à 1 ou n'est pas entière.    | AS3      |
| `SLOT_DISCIPLINE_NOT_FOUND` | NOT_FOUND  | 404  | Aucune discipline n'a l'identifiant donné.              | AS4      |
| `SLOT_FULL`                 | CONFLICT   | 409  | Le créneau compte déjà autant d'inscrits que de places. | AS7      |
| `VOLUNTEER_NAME_REQUIRED`   | VALIDATION | 400  | Le nom est vide ou fait seulement d'espaces.            | AS8      |
| `VOLUNTEER_NAME_TOO_LONG`   | VALIDATION | 400  | Le nom dépasse 100 caractères.                          | AS8      |
| `VOLUNTEER_EMAIL_INVALID`   | VALIDATION | 400  | L'email est mal formé.                                  | AS8      |
| `SLOT_NOT_FOUND`            | NOT_FOUND  | 404  | Aucun créneau n'a l'identifiant donné.                  | AS9      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit. Les tests e2e vérifient en plus le statut HTTP et le code d'erreur que l'appelant voit. Les chemins `domain/`, `application/` et `infra/` sont relatifs à `apps/api/src/modules/volunteers/`.

| Scénario | Fichier de test                               | Niveau      | Ce que le test vérifie                                                                                                                                                                                                                               |
| -------- | --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `domain/slot.spec.ts`                         | unitaire    | Un créneau du 2 novembre 2026 de 9 h à 12 h, de capacité 2, a 0 inscrit ; un créneau dans le passé est accepté.                                                                                                                                      |
| AS1      | `application/volunteers.application.spec.ts`  | unitaire    | Deux créneaux qui se chevauchent sur la même discipline sont tous deux enregistrés.                                                                                                                                                                  |
| AS1      | `infra/drizzle-slot.repository.int.spec.ts`   | intégration | Le créneau relu depuis la base est identique à celui enregistré.                                                                                                                                                                                     |
| AS1      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | `POST /api/creneaux` renvoie 201 avec la discipline, le début, la fin, la capacité et `registeredCount` à 0.                                                                                                                                         |
| AS2      | `domain/slot.spec.ts`                         | unitaire    | Une fin égale (9 h à 9 h) ou antérieure (12 h à 9 h) au début lève `SLOT_END_NOT_AFTER_START`.                                                                                                                                                       |
| AS2      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | Les deux cas renvoient 400, et aucun créneau n'est enregistré.                                                                                                                                                                                       |
| AS3      | `domain/slot.spec.ts`                         | unitaire    | Une capacité de 0, de -1 ou de 1,5 lève `SLOT_CAPACITY_INVALID`.                                                                                                                                                                                     |
| AS3      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | Une capacité de 0 renvoie 400.                                                                                                                                                                                                                       |
| AS4      | `application/volunteers.application.spec.ts`  | unitaire    | Une discipline inconnue lève `SLOT_DISCIPLINE_NOT_FOUND`, et le dépôt reste vide.                                                                                                                                                                    |
| AS4      | `infra/drizzle-discipline-lookup.int.spec.ts` | intégration | `exists()` vaut vrai pour une discipline enregistrée, faux pour un identifiant inconnu.                                                                                                                                                              |
| AS4      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | Renvoie 404 avec le code `SLOT_DISCIPLINE_NOT_FOUND`.                                                                                                                                                                                                |
| AS5      | `application/volunteers.application.spec.ts`  | unitaire    | Awa s'inscrit sur le créneau de capacité 2 : l'inscription garde son nom et son email, `remainingPlaces` vaut 1.                                                                                                                                     |
| AS5      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | `POST /api/creneaux/:id/inscriptions` renvoie 201 avec `remainingPlaces` à 1.                                                                                                                                                                        |
| AS6      | `application/volunteers.application.spec.ts`  | unitaire    | Moussa s'inscrit après Awa : accepté, `remainingPlaces` vaut 0.                                                                                                                                                                                      |
| AS6      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | La démo du PRD : après Awa, l'inscription de Moussa renvoie 201 avec `remainingPlaces` à 0.                                                                                                                                                          |
| AS7      | `domain/slot.spec.ts`                         | unitaire    | `register()` sur un créneau complet lève `SLOT_FULL` et laisse `registeredCount` à 2.                                                                                                                                                                |
| AS7      | `infra/drizzle-slot.repository.int.spec.ts`   | intégration | Concurrence : le créneau est lu deux fois quand il reste une place ; on inscrit Moussa sur la première copie et Fatou sur la seconde, qui croit encore la place libre. La première passe, la seconde lève `SLOT_FULL`, et la base compte 2 inscrits. |
| AS7      | `infra/drizzle-slot.repository.int.spec.ts`   | intégration | Filet : une mise à jour directe de `registered_count` au-delà de `capacity` est refusée par `slots_registered_count_check`.                                                                                                                          |
| AS7      | `infra/drizzle-slot.repository.int.spec.ts`   | intégration | Transaction : une inscription dont l'insertion échoue (identifiant déjà utilisé) lève une erreur, et `registered_count` n'a pas bougé.                                                                                                               |
| AS7      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | Après Awa et Moussa, l'inscription de Fatou renvoie 409 avec le code `SLOT_FULL`.                                                                                                                                                                    |
| AS8      | `domain/registration.spec.ts`                 | unitaire    | Un nom vide, fait d'espaces ou de 101 caractères, et un email mal formé lèvent chacun leur code.                                                                                                                                                     |
| AS8      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | Un nom vide et un email mal formé renvoient 400, et le créneau compte toujours 0 inscrit.                                                                                                                                                            |
| AS9      | `application/volunteers.application.spec.ts`  | unitaire    | Un créneau inconnu lève `SLOT_NOT_FOUND`.                                                                                                                                                                                                            |
| AS9      | `apps/api/test/slots.e2e.spec.ts`             | e2e         | Renvoie 404 avec le code `SLOT_NOT_FOUND`.                                                                                                                                                                                                           |

**Ce que le test de concurrence prouve, et ce qu'il ne prouve pas.** PGlite est un Postgres embarqué avec une seule connexion : ses requêtes passent l'une après l'autre, jamais en parallèle. Le test prouve donc que la décision « il reste une place » est prise par la base, au moment de l'écriture, et non par l'entité lue avant : une copie périmée du créneau ne permet pas de dépasser la capacité, et la contrainte `CHECK` refuse tout dépassement. Il ne prouve pas le comportement de deux transactions réellement simultanées sur un serveur Postgres. Ce comportement repose sur une garantie de Postgres : un `UPDATE` attend le verrou de la ligne, puis réévalue sa condition `registered_count < capacity` sur la valeur à jour, en isolation `READ COMMITTED`. Le prouver demanderait un test sur un vrai serveur Postgres (`DATABASE_URL`), que la suite de tests n'utilise pas aujourd'hui.

## 6. Tâches

Six tâches, dans l'ordre des couches ; chacune tient dans un commit.

- [x] T01 [001-AS1, AS2, AS3] Écrire d'abord `domain/slot.spec.ts` (« 001-AS2: rejects an end that does not follow the start »), puis les schémas partagés de `packages/shared/src/volunteers.ts`, `domain/volunteers.errors.ts` et `Slot.create()` / `Slot.restore()`
- [x] T02 [001-AS5, AS6, AS7, AS8] Écrire d'abord `domain/registration.spec.ts` et les cas d'inscription de `domain/slot.spec.ts` (« 001-AS7: refuses to register on a full slot »), puis l'entité `Registration`, `Slot.register()` et `remainingPlaces`
- [x] T03 [001-AS1, AS4] Écrire d'abord `application/volunteers.application.spec.ts` (« 001-AS4: rejects an unknown discipline »), puis les ports `SlotRepository` et `DisciplineLookup`, leurs fakes en mémoire et `OpenSlot`
- [x] T04 [001-AS5, AS6, AS7, AS9] Compléter d'abord `application/volunteers.application.spec.ts` (« 001-AS6: accepts the last place and leaves 0 »), puis `RegisterVolunteer` et `addRegistration()` dans le fake en mémoire
- [x] T05 [001-AS1, AS4, AS7] Écrire d'abord `infra/drizzle-slot.repository.int.spec.ts` et `infra/drizzle-discipline-lookup.int.spec.ts` (« 001-AS7: never registers beyond capacity when the slot filled meanwhile », « 001-AS7: keeps the place when the registration insert fails »), puis `infra/volunteers.schema.ts`, la migration générée par `pnpm db:generate`, `infra/slot.mapper.ts`, `DrizzleSlotRepository` (incrément et insertion dans une seule transaction) et `DrizzleDisciplineLookup`
- [x] T06 [001-AS1, AS2, AS3, AS4, AS5, AS6, AS7, AS8, AS9] Écrire d'abord `apps/api/test/slots.e2e.spec.ts` (« 001-AS6: shows 0 remaining places after Moussa », « 001-AS7: rejects Fatou on a full slot (409 SLOT_FULL) »), puis `http/slots.controller.ts`, `volunteers.module.ts` et son ajout dans `app.module.ts`

## 7. Corrections

### Passage 1

Le relecteur a relevé une capacité bien formée selon le contrat qui provoque une erreur 500. Le schéma partagé (`packages/shared/src/volunteers.ts:12`) et `Slot.create()` acceptent toute capacité entière, alors que la colonne `capacity` est un `integer` Postgres sur 32 bits. Une capacité de 2147483648 passe donc la validation, puis l'insertion échoue (Postgres 22003, `drizzle-slot.repository.ts:24`) et l'appelant reçoit une erreur 500 au lieu d'un refus.

- [x] T07 [001-AS3] Écrire d'abord un cas de `domain/slot.spec.ts` (« 001-AS3: rejects a capacity above the storable limit ») et un cas de `apps/api/test/slots.e2e.spec.ts` (une capacité de 2147483648 renvoie 400 et rien n'est enregistré), puis borner la capacité à la limite de la colonne par une constante partagée `SLOT_MAX_CAPACITY` (2147483647), dans `openSlotSchema` et dans `Slot.create()` (`SLOT_CAPACITY_INVALID`)

### Passage 2

Le relecteur a prouvé que le nombre de places restantes annoncé peut être faux quand deux inscriptions réussissent en même temps. `RegisterVolunteer` (`application/use-cases/register-volunteer.ts:20-30`) renvoie le créneau lu avant l'écriture, incrémenté en mémoire, et non l'état écrit en base. `DrizzleSlotRepository.addRegistration()` (`infra/drizzle-slot.repository.ts:27-40`) ne renvoie que l'identifiant. Sur un créneau de capacité 3, deux `execute()` lancés par `Promise.all` annoncent tous les deux 2 places restantes alors qu'il en reste 1, en mémoire comme sur PGlite.

- [x] T08 [001-AS6] Écrire d'abord un cas de `application/volunteers.application.spec.ts` et un cas de `infra/drizzle-slot.repository.int.spec.ts` (« 001-AS6: reports the remaining places written by the store when two registrations succeed together » : Awa et Moussa inscrits en même temps sur le créneau de capacité 2, l'une des réponses montre 1 place restante et l'autre 0), puis faire renvoyer par `addRegistration()` le créneau tel qu'écrit (`RETURNING` de l'UPDATE conditionnel en base, état stocké dans le fake en mémoire), et faire renvoyer ce créneau par `RegisterVolunteer`

### Décision humaine après le passage 2

La relecture finale a trouvé deux entrées acceptées par la validation et refusées par Postgres, qui renvoient une erreur 500 au lieu d'un refus 400. L'humain a décidé de les corriger dans une tâche supplémentaire, hors du compte des passages.

- Une date en l'an 0000, une fois convertie en UTC (`0000-01-01T09:00:00Z`, ou `0001-01-01T00:30:00+01:00`), passe `openSlotSchema` (`packages/shared/src/volunteers.ts:12-13`) et `Slot.create()` (`domain/slot.ts:28-46`), puis Postgres la refuse (erreur 22008). Une date après l'an 9999 en UTC (`9999-12-31T23:30:00-01:00`) relève du même défaut.
- Un nom contenant U+0000 passe `registerVolunteerSchema` (`packages/shared/src/volunteers.ts:27`) et `validName()` (`domain/registration.ts:60-72`), puis Postgres le refuse.

- [x] T09 [001-AS1, AS8] Écrire d'abord des cas de `domain/slot.spec.ts` (« 001-AS1: rejects a date outside years 1 to 9999 in UTC »), de `domain/registration.spec.ts` (« 001-AS8: rejects a name containing a NUL character ») et de `apps/api/test/slots.e2e.spec.ts` (400 et rien d'enregistré dans les deux cas), puis refuser ces entrées dans le schéma partagé et dans le domaine, avec les nouveaux codes `SLOT_DATE_OUT_OF_RANGE` et `VOLUNTEER_NAME_INVALID` (VALIDATION, 400)
