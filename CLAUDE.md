# CLAUDE.md

Application d'organisation des JOJ Dakar 2026 : une API NestJS (`apps/api`), un front React (`apps/web`) et des schémas partagés (`packages/shared`), dans un monorepo pnpm. Commandes et structure détaillée : `README.md`.

## Méthodologie

- Une nouvelle fonctionnalité suit le cycle `/prd` → `/spec` → `/spec-plan` → `/tdd-task` → `/converge`, selon les six principes de `specs/constitution.md`. Une petite évolution d'un module existant : un scénario ajouté à sa spec, puis TDD, sans PRD ni plan.
- Test d'abord : un test vu en échec pour la bonne raison (`pnpm tdd:red <fichier>`), puis le code minimal.
- `pnpm verify` avant chaque commit (lefthook le relance) ; `pnpm check` avant de conclure. Jamais de `--no-verify`.
- Une tâche = un commit Conventional Commits qui cite la tâche et le scénario : `feat(benevoles): T03 refuse a full slot (001-AS2)`. Sans plan, un seul commit qui cite le scénario : `feat(api): … (000-AS12)`.
- Ordre de construction d'une fonctionnalité : `README.md`, « Ajouter une fonctionnalité ». Relecture finale par le sous-agent `relecteur`.
- Specs : ne jamais inventer un besoin ou une justification métier, demander. Si une spec dépasse sa limite de lignes, proposer la coupe avant de l'appliquer.

## Architecture

- `apps/api` et `apps/web` importent `@joj/shared`, jamais l'un l'autre : le front parle à l'API par HTTP (`apps/web/src/lib/api/`). `packages/shared` ne dépend que de `zod`.
- Un module par domaine dans `apps/api/src/modules/<domaine>/`, découpé en `domain/`, `application/`, `infra/`, `http/`, sur le modèle de `disciplines`. Le transverse est dans `apps/api/src/core/`.
- `domain/` est du TypeScript pur : ni NestJS, ni Drizzle, ni `pg` (vérifié par `.oxlintrc.json`).
- `application/` dépend d'un port (classe abstraite `<entité>.repository.ts`), relié à son implémentation `infra/drizzle-….repository.ts` dans `<domaine>.module.ts` seulement.
- Un controller est fin : valider (DTO `createZodDto`), appeler un seul cas d'usage, sérialiser (`@ZodSerializerDto`). Aucune règle métier.
- Front : `apps/web/src/features/<nom>/api/` (`<nom>.api.ts` pour les appels, `<nom>.queries.ts` pour les hooks TanStack Query), `components/`, et une route par fichier dans `src/routes/`.
- La fausse API `apps/web/src/mocks/handlers.ts` respecte le même contrat que l'API : mêmes schémas, mêmes statuts, mêmes codes d'erreur.

## Concepts appréciés

- Typage strict (`strict`, `noUncheckedIndexedAccess`) : pas de `any`, types dérivés des schémas Zod (`z.infer`).
- Une classe par cas d'usage, avec une seule méthode publique `execute()`.
- Entité au constructeur privé : `create()` applique les règles, `restore()` relit la base sans les rejouer. Mapper `toDomain()` / `toRow()` dans `infra/`.
- Le domaine revalide ses règles sans faire confiance à la validation HTTP ; une contrainte en base sert de filet face à la concurrence.
- Constantes partagées plutôt que nombres en double (`DISCIPLINE_NAME_MAX_LENGTH`). Commentaires qui disent pourquoi, en français.

## Bonnes pratiques

- Toute erreur métier est une `AppError` (code stable + catégorie `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE`), créée par une fabrique (`disciplineNameTaken()`). Seul `ProblemDetailsFilter` la transforme en HTTP (RFC 9457).
- Une erreur de base (contrainte d'unicité) est traduite en erreur métier dans le repository (`isUniqueViolation`).
- Une entrée est validée par un schéma Zod de `packages/shared`, jamais à la main dans le controller ; le front valide ses réponses avec les mêmes schémas.
- Aucun secret dans le code : les valeurs sensibles vont dans `apps/api/.env` (modèle : `.env.example`).
- Migrations générées par `pnpm db:generate`, jamais éditées à la main.
- Tests : domaine sans dépendance, cas d'usage avec le repository en mémoire (`application/testing/`), repository sur PGlite (`*.int.spec.ts`), API en e2e via `test/create-test-app.ts`, front sur MSW avec Testing Library et un audit axe par état d'écran (`*.a11y.test.tsx`).

## Nommage

- Fichiers en kebab-case, suffixés par leur rôle : `discipline.ts`, `disciplines.errors.ts`, `discipline.mapper.ts`, `disciplines.schema.ts`, `drizzle-discipline.repository.ts`.
- Singulier pour une entité (`Discipline`, `DisciplineRepository`), pluriel pour le module (`DisciplinesController`, `DisciplinesModule`).
- Cas d'usage nommés verbe + objet, sans suffixe : `create-discipline.ts` → `CreateDiscipline` ; `ListDisciplines` au pluriel.
- Implémentation d'un port préfixée par sa technologie : `DrizzleDisciplineRepository`, `InMemoryDisciplineRepository`.
- Codes d'erreur en majuscules, préfixés par le domaine : `DISCIPLINE_NAME_TAKEN`, `DISCIPLINE_NOT_FOUND`. Messages en anglais.
- Tests : `*.spec.ts`, `*.int.spec.ts`, `*.e2e.spec.ts` côté API et `shared` ; `*.test.tsx` côté front.
- Titres de tests en anglais, au présent, préfixés par le scénario : `it('000-AS4: rejects a name already taken (409)')`.
