# 002 — Podiums : plan

**Statut** : Validé

## 1. Résumé

On construit, côté API seulement, la publication d'un podium vérifié contre le résultat officiel d'une épreuve, et la consultation publique des podiums publiés d'une épreuve. Une fois les tâches terminées, un journaliste poste par l'API le podium d'une épreuve des données de départ (or, argent, bronze, chacun par son dossard) : s'il correspond au résultat officiel dans l'ordre, il est publié avec le statut VALIDE et apparaît dans la consultation de l'épreuve ; sinon il est refusé (409 `PODIUM_CONTRADICTS_OFFICIAL`, ou 409 `OFFICIAL_RESULT_UNKNOWN` si l'épreuve n'a pas de résultat officiel, ou 404 `EVENT_NOT_FOUND` si elle n'existe pas). Le travail est découpé en quatre tâches, dans l'ordre des couches : le domaine, les cas d'usage, la base de données avec les données de départ, puis les routes HTTP et leurs tests de bout en bout. Les posts PROVISOIRE, l'enregistrement du résultat officiel par l'API, la trace des posts refusés, l'authentification, la fausse API du front et tout écran sont laissés de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec        | Dans le code                | Ce que c'est                                                                                                                            |
| ------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Podiums (le module) | module `podiums`            | Le dossier `apps/api/src/modules/podiums/` qui regroupe toute la tranche.                                                               |
| épreuve             | `SportEvent`                | Une épreuve des JOJ, avec son nom et, peut-être, son résultat officiel. `Event` est déjà un type global de TypeScript, d'où le préfixe. |
| podium              | `Podium`                    | Trois dossards dans l'ordre : `gold`, `silver`, `bronze`.                                                                               |
| dossard             | `bib`                       | Le numéro d'un athlète sur la liste de départ, entier positif.                                                                          |
| résultat officiel   | `officialResult`            | Le `Podium` officiel de l'épreuve, ou `null` s'il n'est pas connu.                                                                      |
| post                | `PodiumPost`                | Un podium publié par un journaliste pour une épreuve, avec son statut et sa date.                                                       |
| nom du journaliste  | `journalistName`            | Le nom qui identifie le journaliste, de 1 à 100 caractères.                                                                             |
| statut VALIDE       | `status: 'VALIDE'`          | Le seul statut de cette tranche ; `PROVISOIRE` et `REJETE` viendront en TR2.                                                            |
| poster un podium    | `PostPodium`                | Le cas d'usage qui vérifie un podium et publie le post.                                                                                 |
| consulter les posts | `ListEventPosts`            | Le cas d'usage qui renvoie les posts d'une épreuve, du plus ancien au plus récent.                                                      |
| données de départ   | `apps/api/data/events.json` | Le fichier chargé par `pnpm db:seed` dans la table `events`, avec les résultats officiels.                                              |

## 2. Fichiers par couche

On crée le module `podiums`, organisé comme le module Disciplines : un dossier par couche (`domain/`, `application/`, `infra/`, `http/`). Les modules Disciplines et Bénévoles ne sont pas modifiés. Les chemins `domain/`, `application/`, `infra/` et `http/` sont relatifs à `apps/api/src/modules/podiums/`.

- **shared** :
  - `packages/shared/src/podiums.ts` contient les schémas Zod échangés avec l'API : `postPodiumSchema` (nom du journaliste de 1 à 100 caractères après suppression des espaces et sans caractère U+0000, grâce à `hasNulCharacter` de `volunteers.ts` ; `gold`, `silver` et `bronze` entiers de 1 à `PODIUM_BIB_MAX`, avec un `refine` qui refuse un même dossard à deux places), `eventIdParamsSchema`, `podiumPostSchema` et `podiumPostListSchema` pour les réponses, `podiumPostStatusSchema` (`z.enum(['VALIDE'])`), et les constantes `JOURNALIST_NAME_MAX_LENGTH = 100` et `PODIUM_BIB_MAX = 2147483647`. Cette dernière est une limite technique, le plus grand `integer` Postgres, pour qu'un dossard trop grand soit refusé en 400 au lieu d'une erreur 500.
  - `packages/shared/src/index.ts` exporte ce nouveau fichier.
- **domain** :
  - `domain/podiums.errors.ts` définit `PodiumError` (une `AppError`) avec ses codes (section 4), et les fabriques `eventNotFound()`, `officialResultUnknown()` et `podiumContradictsOfficial()`.
  - `domain/podium.ts` définit la valeur `Podium` : `create()` refuse un dossard qui n'est pas un entier de 1 à `PODIUM_BIB_MAX` et un même dossard à deux places ; `equals(other)` est vrai si l'or, l'argent et le bronze sont les mêmes, dans cet ordre.
  - `domain/sport-event.ts` définit l'entité `SportEvent`, lue seulement (`restore()`) : `id`, `name`, `officialResult` (`Podium` ou `null`), et la méthode `certify(podium)` qui lève `OFFICIAL_RESULT_UNKNOWN` si le résultat officiel manque et `PODIUM_CONTRADICTS_OFFICIAL` si le podium ne lui est pas égal.
  - `domain/podium-post.ts` définit l'entité `PodiumPost` : `publish({ id, event, journalistName, podium, postedAt })` supprime les espaces autour du nom, refuse un nom vide, de plus de 100 caractères ou contenant U+0000, appelle `event.certify(podium)`, puis renvoie un post de statut `VALIDE` ; `restore()` relit la base sans rejouer ces règles.
- **application** :
  - `application/sport-event.repository.ts` est le port `SportEventRepository`, avec une seule méthode `findById(id)` qui renvoie la `SportEvent` ou `null`.
  - `application/podium-post.repository.ts` est le port `PodiumPostRepository` : `insert(post)` et `listByEvent(eventId)`, qui renvoie les posts dans l'ordre de publication.
  - `application/testing/in-memory-sport-event.repository.ts` et `application/testing/in-memory-podium-post.repository.ts` sont leurs implémentations en mémoire pour les tests.
  - `application/use-cases/post-podium.ts` (`PostPodium`) charge l'épreuve (sinon `EVENT_NOT_FOUND`), crée le `Podium`, appelle `PodiumPost.publish()` et enregistre le post seulement s'il est certifié.
  - `application/use-cases/list-event-posts.ts` (`ListEventPosts`) vérifie que l'épreuve existe (sinon `EVENT_NOT_FOUND`) et renvoie ses posts.
- **infra** :
  - `infra/podiums.schema.ts` déclare les tables `events` et `podium_posts` (section 3).
  - `infra/sport-event.mapper.ts` et `infra/podium-post.mapper.ts` contiennent `toDomain()`, et `toRow()` pour le post.
  - `infra/drizzle-sport-event.repository.ts` (`DrizzleSportEventRepository`) et `infra/drizzle-podium-post.repository.ts` (`DrizzlePodiumPostRepository`) implémentent les deux ports ; `listByEvent()` trie par la colonne `seq`.
  - `apps/api/data/events.json` contient les données de départ : « 100 m filles », de résultat officiel 214, 108, 331, et « 200 m garçons », sans résultat officiel, avec des identifiants fixes. Le nom suit la convention du seed (`tableNameFromFile()` dans `apps/api/scripts/db-core.mts`) : le nom du fichier est celui de la table, et le préfixe numérique (`01-…`) ne sert qu'à charger une table avant une autre qui la référence. La table `events` ne référence aucune autre table et `podium_posts` n'est pas chargée au départ : pas de préfixe, comme `disciplines.json`.
- **http** :
  - `http/event-podiums.controller.ts` (`EventPodiumsController`) déclare deux routes :
    - `POST /api/epreuves/:id/podiums` poste un podium (corps : `journalistName`, `gold`, `silver`, `bronze`) et renvoie 201 avec le post : `id`, `eventId`, `journalistName`, `gold`, `silver`, `bronze`, `status` (`VALIDE`), `postedAt`.
    - `GET /api/epreuves/:id/podiums` renvoie 200 avec la liste des posts de l'épreuve, du plus ancien au plus récent, au même format ; une liste vide si l'épreuve n'a aucun post.
  - `podiums.module.ts` (`PodiumsModule`) relie les deux ports à leurs implémentations Drizzle et déclare les cas d'usage ; il est ajouté aux `imports` de `apps/api/src/app.module.ts`.
- **web** : rien. L'écran et la fausse API sont hors périmètre.

## 3. Données

On stocke les épreuves avec leur résultat officiel, qui viennent seulement des données de départ, et les posts publiés. La migration est générée par `pnpm db:generate --name=create_events_and_podium_posts` à partir de `infra/podiums.schema.ts`, et jamais écrite ni retouchée à la main.

- **`events`** : `id` (uuid, clé primaire), `name` (text, non nul), `official_gold_bib`, `official_silver_bib` et `official_bronze_bib` (integer, nuls tous les trois quand le résultat officiel n'est pas connu).
  - La contrainte `events_official_result_check` exige que les trois dossards soient tous nuls ou tous renseignés et distincts : un résultat officiel est complet ou absent, jamais à moitié (AS1, AS4).
- **`podium_posts`** : `id` (uuid, clé primaire), `seq` (integer, généré par la base, `GENERATED ALWAYS AS IDENTITY`), `event_id` (uuid, non nul, clé étrangère vers `events.id`), `journalist_name` (varchar 100, non nul), `gold_bib`, `silver_bib`, `bronze_bib` (integer, non nuls), `status` (text, non nul), `posted_at` (timestamptz, précision milliseconde, non nul).
  - `seq` fixe l'ordre de consultation (AS2, AS6) : deux posts de la même milliseconde gardent leur ordre de publication, ce que `posted_at` seul ne garantit pas.
  - La clé étrangère garantit qu'un post appartient à une épreuve existante (AS5).
  - La contrainte `podium_posts_distinct_bibs_check` refuse un même dossard à deux places (AS7).
  - La contrainte `podium_posts_status_check` (`status = 'VALIDE'`) garantit que seul un podium certifié est publié (AS3, AS4) ; TR2 l'élargira.
  - Aucune contrainte ne lie un post au résultat officiel : la comparaison est une règle du domaine (`SportEvent.certify()`), et le résultat officiel ne change pas dans cette tranche.
- **Dette connue** : le résultat officiel tient en trois colonnes, une par place, et un post en trois dossards. Ce modèle ne supporte pas les épreuves à deux bronzes (judo, boxe, lutte) ni les ex aequo. Il faudra le revoir avec TR7, qui traite ces épreuves.

## 4. Erreurs

Chaque refus de la spec devient une erreur métier (`AppError`), avec un code stable et un statut HTTP. Les entrées mal formées sont d'abord refusées par le schéma Zod partagé, avec le code générique `VALIDATION_FAILED` (400), comme pour les disciplines : c'est ce que l'appelant voit en AS7. Le domaine revérifie ces règles avec ses propres codes, qui protègent un appel qui ne passerait pas par HTTP.

| Code AppError                 | Catégorie  | HTTP | Quand                                                                        | Scénario |
| ----------------------------- | ---------- | ---- | ---------------------------------------------------------------------------- | -------- |
| `PODIUM_CONTRADICTS_OFFICIAL` | CONFLICT   | 409  | Le podium n'a pas les mêmes dossards que le résultat officiel, dans l'ordre. | AS3      |
| `OFFICIAL_RESULT_UNKNOWN`     | CONFLICT   | 409  | L'épreuve existe mais n'a pas de résultat officiel.                          | AS4      |
| `EVENT_NOT_FOUND`             | NOT_FOUND  | 404  | Aucune épreuve n'a l'identifiant donné, pour poster ou pour consulter.       | AS5      |
| `JOURNALIST_NAME_REQUIRED`    | VALIDATION | 400  | Le nom est vide ou fait seulement d'espaces.                                 | AS7      |
| `JOURNALIST_NAME_TOO_LONG`    | VALIDATION | 400  | Le nom dépasse 100 caractères.                                               | AS7      |
| `JOURNALIST_NAME_INVALID`     | VALIDATION | 400  | Le nom contient U+0000, que Postgres refuse dans un texte.                   | AS7      |
| `PODIUM_BIB_INVALID`          | VALIDATION | 400  | Un dossard n'est pas un entier de 1 à `PODIUM_BIB_MAX`.                      | AS7      |
| `PODIUM_BIBS_NOT_DISTINCT`    | VALIDATION | 400  | Un même dossard occupe deux places.                                          | AS7      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit. Les tests e2e ne dépendent pas de `data/events.json` : comme `slots.e2e.spec.ts`, le fichier insère lui-même ses épreuves en base (`DATABASE`), le « 100 m filles » avec son résultat officiel et le « 200 m garçons » sans. Un seul test d'intégration, `infra/events-seed.int.spec.ts`, lit les données de départ.

| Scénario | Fichier de test                                         | Niveau      | Ce que le test vérifie                                                                                                                                                    |
| -------- | ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `domain/podium-post.spec.ts`                            | unitaire    | Awa publie 214, 108, 331 sur le « 100 m filles » : le post garde son nom, les trois dossards dans l'ordre, statut `VALIDE`.                                               |
| AS1      | `infra/drizzle-podium-post.repository.int.spec.ts`      | intégration | Le post relu depuis la base est identique à celui enregistré.                                                                                                             |
| AS1      | `apps/api/test/event-podiums.e2e.spec.ts`               | e2e         | `POST /api/epreuves/:id/podiums` renvoie 201 avec le post de statut `VALIDE`.                                                                                             |
| AS2      | `application/podiums.application.spec.ts`               | unitaire    | Après le post d'Awa, `ListEventPosts` le renvoie ; une épreuve sans post renvoie une liste vide.                                                                          |
| AS2      | `apps/api/test/event-podiums.e2e.spec.ts`               | e2e         | `GET /api/epreuves/:id/podiums` renvoie 200 avec le post d'Awa, puis une liste vide pour le « 200 m garçons ».                                                            |
| AS3      | `domain/sport-event.spec.ts`                            | unitaire    | 108, 214, 331 et 214, 108, 999 lèvent `PODIUM_CONTRADICTS_OFFICIAL`.                                                                                                      |
| AS3      | `application/podiums.application.spec.ts`               | unitaire    | Après ces deux refus, le dépôt ne contient aucun post.                                                                                                                    |
| AS3      | `apps/api/test/event-podiums.e2e.spec.ts`               | e2e         | Les deux cas renvoient 409 `PODIUM_CONTRADICTS_OFFICIAL`, et la consultation ne contient pas le post refusé.                                                              |
| AS4      | `domain/sport-event.spec.ts`                            | unitaire    | `certify()` sur une épreuve sans résultat officiel lève `OFFICIAL_RESULT_UNKNOWN`.                                                                                        |
| AS4      | `infra/drizzle-sport-event.repository.int.spec.ts`      | intégration | Deux épreuves insérées par le test sont relues : l'une avec son résultat officiel, l'autre avec `officialResult` à `null`.                                                |
| AS4      | `infra/events-seed.int.spec.ts`                         | intégration | Seul test qui lit `data/events.json` : chargées par `seedStatements` dans une base migrée, les données de départ contiennent au moins une épreuve sans résultat officiel. |
| AS4      | `apps/api/test/event-podiums.e2e.spec.ts`               | e2e         | Un post sur le « 200 m garçons » renvoie 409 `OFFICIAL_RESULT_UNKNOWN`, et sa consultation reste vide.                                                                    |
| AS5      | `application/podiums.application.spec.ts`               | unitaire    | `PostPodium` et `ListEventPosts` sur une épreuve inconnue lèvent `EVENT_NOT_FOUND`.                                                                                       |
| AS5      | `apps/api/test/event-podiums.e2e.spec.ts`               | e2e         | `POST` et `GET` sur une épreuve inconnue renvoient 404 `EVENT_NOT_FOUND`.                                                                                                 |
| AS6      | `infra/drizzle-podium-post.repository.int.spec.ts`      | intégration | Deux posts enregistrés à la même milliseconde sont relus dans leur ordre d'insertion.                                                                                     |
| AS6      | `apps/api/test/event-podiums.e2e.spec.ts`               | e2e         | Après Awa, Moussa poste le même podium : 201, et la consultation montre les deux posts dans l'ordre, chacun `VALIDE`, le premier inchangé.                                |
| AS7      | `domain/podium.spec.ts` et `domain/podium-post.spec.ts` | unitaire    | Un dossard de 0, de -1, de 1,5 ou de 2147483648, un même dossard à deux places, un nom vide, d'espaces, de 101 caractères ou avec U+0000 lèvent chacun leur code.         |
| AS7      | `apps/api/test/event-podiums.e2e.spec.ts`               | e2e         | Un nom vide, un dossard manquant, un dossard de 0 et un même dossard à deux places renvoient 400 `VALIDATION_FAILED`, et la consultation reste vide.                      |

## 6. Tâches

Quatre tâches, dans l'ordre des couches ; chacune tient dans un commit.

- [x] T01 [002-AS1, AS3, AS4, AS7] Écrire d'abord `domain/podium.spec.ts`, `domain/sport-event.spec.ts` et `domain/podium-post.spec.ts` (« 002-AS3: rejects a podium that contradicts the official result »), puis les schémas partagés de `packages/shared/src/podiums.ts`, `domain/podiums.errors.ts`, `Podium`, `SportEvent` et `PodiumPost`
- [ ] T02 [002-AS1, AS2, AS3, AS4, AS5] Écrire d'abord `application/podiums.application.spec.ts` (« 002-AS5: rejects an unknown event »), puis les ports `SportEventRepository` et `PodiumPostRepository`, leurs implémentations en mémoire, `PostPodium` et `ListEventPosts`
- [ ] T03 [002-AS1, AS4, AS6] Écrire d'abord `infra/drizzle-sport-event.repository.int.spec.ts`, `infra/drizzle-podium-post.repository.int.spec.ts` et `infra/events-seed.int.spec.ts` (« 002-AS4: seeds at least one event without an official result », « 002-AS6: lists posts in publication order »), puis `infra/podiums.schema.ts`, la migration générée par `pnpm db:generate`, `apps/api/data/events.json`, les mappers et les deux repositories Drizzle
- [ ] T04 [002-AS1, AS2, AS3, AS4, AS5, AS6, AS7] Écrire d'abord `apps/api/test/event-podiums.e2e.spec.ts` (« 002-AS3: rejects a contradicting podium (409 PODIUM_CONTRADICTS_OFFICIAL) »), puis `http/event-podiums.controller.ts`, `podiums.module.ts` et son ajout dans `app.module.ts`
