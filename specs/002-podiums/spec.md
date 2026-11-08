# 002 — Podiums

**Statut** : Implémentée
**PRD** : specs/prd-podiums.md, TR1

## Contexte

Pendant les JOJ Dakar 2026, les journalistes recoupent les podiums à la main, et un podium faux, une fois publié, se corrige mal. Cette première tranche vérifie chaque podium posté contre le résultat officiel de l'épreuve, connu dès les données de départ : seul un podium conforme est publié, et le public le voit VALIDE. Elle se démontre par l'API seule.

## User stories

- En tant que journaliste sportif, je veux poster le podium d'une épreuve en donnant les dossards de l'or, de l'argent et du bronze, afin de le publier sans recouper à la main, et d'être arrêté avant de publier un podium faux.
- En tant que lecteur des résultats, je veux consulter les podiums publiés d'une épreuve, afin de savoir qu'ils sont confirmés par le résultat officiel.

## Scénarios d'acceptation

Exemple commun, issu des données de départ : l'épreuve « 100 m filles », dont le résultat officiel est l'or au dossard 214, l'argent au 108 et le bronze au 331, et l'épreuve « 200 m garçons », sans résultat officiel. Les données de départ contiennent toujours au moins une épreuve sans résultat officiel, pour démontrer AS4.

### AS1 — Poster un podium conforme

- **Étant donné** le « 100 m filles » et son résultat officiel · **Quand** la journaliste Awa poste le podium or 214, argent 108, bronze 331 · **Alors** c'est accepté : le post est publié avec son nom, l'épreuve, les trois dossards dans l'ordre et le statut VALIDE.

### AS2 — Consulter les posts d'une épreuve

- **Étant donné** le « 100 m filles », où Awa a publié le podium d'AS1 · **Quand** un lecteur consulte les posts de l'épreuve · **Alors** il voit ce post, avec le nom de la journaliste, les trois dossards et le statut VALIDE. Les posts sont montrés du plus ancien au plus récent ; une épreuve sans post publié montre une liste vide.

### AS3 — Podium qui contredit le résultat officiel

- **Étant donné** le « 100 m filles » et son résultat officiel · **Quand** Awa poste or 108, argent 214, bronze 331 (places inversées), ou or 214, argent 108, bronze 999 (un athlète absent du podium officiel) · **Alors** refus 409, code PODIUM_CONTRADICTS_OFFICIAL, dans les deux cas, et la consultation des posts de l'épreuve ne contient pas le post refusé.

### AS4 — Épreuve sans résultat officiel

- **Étant donné** l'épreuve « 200 m garçons », qui existe mais n'a pas de résultat officiel · **Quand** Awa poste un podium pour elle · **Alors** refus 409, code OFFICIAL_RESULT_UNKNOWN, et aucun post n'est publié pour cette épreuve.

### AS5 — Épreuve inconnue

- **Étant donné** une épreuve qui n'existe pas · **Quand** Awa poste un podium pour elle, ou qu'un lecteur consulte ses posts · **Alors** refus 404, code EVENT_NOT_FOUND.

### AS6 — Un post ne se modifie pas : on en poste un nouveau

- **Étant donné** le « 100 m filles », où Awa a publié le podium d'AS1 · **Quand** Moussa poste à son tour le même podium conforme · **Alors** c'est accepté, et la consultation de l'épreuve montre les deux posts, chacun VALIDE, sans que le premier soit modifié.

### AS7 — Post incomplet ou mal formé

- **Étant donné** un nom de journaliste vide, fait d'espaces ou de plus de 100 caractères, un dossard manquant ou qui n'est pas un entier positif, ou un même dossard à deux places · **Quand** le podium est posté · **Alors** refus 400, code VALIDATION_FAILED, comme pour les disciplines ; la réponse dit pourquoi, et rien n'est publié. Un même dossard à deux places est refusé ainsi avant toute comparaison avec le résultat officiel.

## Hors périmètre

- Les posts PROVISOIRE et l'enregistrement du résultat officiel (TR2).
- La trace des posts refusés, la modification ou la suppression d'un post.
- L'authentification et tout écran : la journaliste poste par l'API.

## Questions ouvertes

- Aucune : l'ordre de consultation (du plus ancien au plus récent post, AS2), le dossard entier positif et le nom limité à 100 caractères (AS7), le 404 en consultation (AS5) et le refus d'un même dossard à deux places (AS7) sont confirmés.
