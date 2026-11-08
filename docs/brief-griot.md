# Brief — « Le griot qui vérifie » (démo JOJ Dakar 2026)

> Fichier de contexte pour Claude Code. À lire avant toute tâche sur ce projet.
> Les règles du CLAUDE.md (couches domain/application/infra/http, AppError, TDD,
> Conventional Commits) restent prioritaires.

## Objectif

Application déployée avec un lien de démo, à envoyer aux organisateurs
**vendredi 13 novembre 2026, avant 14 h**. Le jury juge la créativité, le design,
l'effet « waouh » et une app qui paraît humaine. Le technique doit simplement marcher.

## Concept

Comme le griot, gardien de la parole juste, l'app n'annonce un podium qu'une fois
vérifié contre le résultat officiel. La vérification est un moment mis en scène :
les dossards sont comparés un à un, le podium s'élève si c'est confirmé, et le refus
est raconté avec caractère sinon.

## Existant

- API : spec 002 « Podiums », POST et GET /api/epreuves/:id/podiums.
  Réponses : 201 publié, 409 PODIUM_CONTRADICTS_OFFICIAL, 409 OFFICIAL_RESULT_UNKNOWN,
  404 EVENT_NOT_FOUND. Données dans apps/api/data/events.json (2 épreuves).
- Aucun écran podiums. Rien n'est déployé.
- Dette connue : le mapper podiums rejoue les règles du domaine ; longueur des noms
  comptée en UTF-16 ; pas de gestion de deux bronzes ni des ex aequo ; un test e2e lent
  et intermittent (timeout 30 s) ; pas de clé étrangère créneau → discipline.

## Contraintes non négociables

1. **Aucun secret dans le code ni dans Git.** Toute la config passe par des variables
   d'environnement ; seul un `.env.example` sans vraie valeur est versionné.
2. **Athlètes mineurs : aucun nom de personne** dans les données. Uniquement des
   dossards (nombres) et des codes pays ISO 3166 alpha-3.
3. **Pas d'épreuve à deux médailles de bronze** dans la démo (judo, taekwondo, lutte,
   boxe) : le domaine ne le gère pas. C'est une limite documentée dans le README.
4. **Épreuves réelles uniquement** : la liste est fournie par moi. N'en invente aucune.
5. **Images officielles** (logo, mascotte AYO, photos) : utilisées sans modification,
   avec crédits. Aucune photo où un nom d'athlète se lit.
6. **Hébergement gratuit** : base PostgreSQL sur Neon, API NestJS sur Render
   (web service Free, Node 24, région Frankfurt), front sur Vercel.
   L'API Render s'endort après 15 min et met environ 1 min à se réveiller.
7. Pas de nouvelle dépendance sans me la proposer d'abord.

## Direction visuelle « Soleil de Saly »

| Token                              | Valeur            | Usage                                          |
| ---------------------------------- | ----------------- | ---------------------------------------------- |
| `--saly-sable`                     | #FFF6E9           | Fond de page                                   |
| `--joj-encre`                      | #1A1A1A           | Texte courant                                  |
| `--joj-bleu`                       | #012D80           | Marque : bandeau, titres, bouton Publier       |
| `--joj-menthe` → `--joj-turquoise` | #DFFDEE → #70E0C4 | Dégradé, uniquement en fond du podium confirmé |
| `--joj-vert`                       | #3E611F           | Confirmé, dossard qui correspond               |
| `--joj-rouge`                      | #E5272E           | Refus : fond du dossard fautif, texte blanc    |
| `--joj-rouge-nuit`                 | #A71329           | Texte du refus sur fond sable                  |
| `--saly-ocre`                      | #F2A33A           | Or du podium, frise wax ; jamais en texte      |
| `--saly-argent`                    | #9AA3B5           | Médaille d'argent                              |
| `--saly-bronze`                    | #A9643A           | Médaille de bronze                             |

- Polices : Big Shoulders Display 800 (titres, dossards) et DM Sans 400/500 (texte),
  via `@fontsource`.
- Animations (3 moments au maximum, en CSS transform et opacity seulement,
  toutes coupées avec `prefers-reduced-motion`) :
  1. Vérification : les trois dossards se retournent l'un après l'autre (or, argent, bronze), 600 ms chacun.
  2. Confirmation : les marches montent (argent, bronze, puis or plus haut).
  3. Refus : le dossard fautif passe en rouge, le podium reste au sol.
- L'animation démarre à la réponse de l'API ; elle ne simule jamais un résultat.
- Les micro-textes sont réunis dans un seul fichier `copy.ts`. Le griot parle avec
  chaleur, sans se moquer ; quelques mots de wolof, toujours avec le sens en français.

## Plan de la semaine

| Jour        | Travail                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lundi 9     | Étape 0 (audit) et étape 1 (déployer l'existant : config par env, /api/health, migrations et seed idempotents au démarrage, render.yaml, VITE_API_URL, MSW coupé en production) |
| Mardi 10    | Étape 2 (données de démo riches + docs/demo.md), puis /prd et /spec de l'écran podiums                                                                                          |
| Mercredi 11 | Écran podiums fonctionnel, sans animation (/spec-plan, /tdd-task, /converge)                                                                                                    |
| Jeudi 12    | Mise en scène, écran de réveil de l'API, logos, crédits, README                                                                                                                 |
| Vendredi 13 | Contrôle accessibilité et mobile, répétition, envoi avant 14 h                                                                                                                  |

## Comment travailler avec moi

- Toujours en plan mode d'abord ; j'approuve avant toute modification.
- Une étape à la fois, `pnpm check` après chaque étape, un commit Conventional Commits par étape.
- Jamais de test supprimé, `.skip` ou timeout augmenté pour faire passer le check :
  explique-moi la cause à la place.
- Chaque affirmation sur le code cite le fichier concerné.
