# PRD — Podiums

**Statut** : Validé

## Problème

Pendant les JOJ Dakar 2026, les résultats sont dispersés sur plusieurs sites. Les journalistes sportifs recoupent les podiums à la main pour publier avant leur bouclage, et un podium faux, une fois publié, se corrige mal.

## Utilisateurs

- Journaliste sportif : publier vite le podium d'une épreuve du jour, sans risquer d'en publier un faux.
- Lecteur des résultats : consulter les podiums publiés et savoir lesquels sont confirmés.

## Proposition

Le journaliste poste le podium d'une épreuve en désignant chaque athlète par son identifiant, le numéro de dossard lu sur la liste de départ officielle de l'épreuve ; l'application le compare au résultat officiel des JOJ. Un podium correspond si l'or, l'argent et le bronze sont, dans cet ordre, les mêmes athlètes que dans le résultat officiel. S'il correspond, le post est VALIDE et visible du public ; s'il contredit un résultat officiel connu, il est refusé avant publication : un podium faux connu comme tel n'est jamais publié. Ensuite, un podium posté avant le résultat officiel est PROVISOIRE, puis devient VALIDE ou REJETE dès que le résultat arrive. Le journaliste publie sans recouper à la main, et une erreur est signalée automatiquement plutôt que découverte par ses lecteurs.

## Mesure du succès

- Démo TR1 : un podium conforme au résultat officiel est publié VALIDE ; un podium qui le contredit est refusé ; une épreuve sans résultat officiel est refusée. Démo TR2 : un post avant le résultat officiel est PROVISOIRE ; on enregistre le résultat ; ce post devient VALIDE, et un post faux devient REJETE. Démo TR3 : le tableau des médailles par pays concorde avec les seuls résultats officiels.

## Tranches

### TR1 — Poster un podium vérifié contre l'officiel

Le journaliste poste un podium ; le public le voit VALIDE. Le résultat officiel de chaque épreuve vient des données de départ. Règles : le podium correspond s'il a les mêmes athlètes aux trois places, dans l'ordre ; sinon, ou si l'épreuve n'a pas de résultat officiel, il est refusé. Un post ne se modifie pas : le journaliste en poste un nouveau. TR1 bloque les erreurs de recopie (places inversées, mauvais athlète) avant publication, et chaque post publié est certifié VALIDE aux yeux du public : c'est la plus petite chose qui empêche un faux podium d'être publié. Publier avant l'officiel, qui fait gagner du temps, arrive en TR2 : c'est assumé. Avant TR3, le journaliste poste par l'API, sans écran.

### TR2 — Posts provisoires et enregistrement du résultat officiel

Un podium posté sans résultat officiel est PROVISOIRE. Le résultat officiel s'enregistre par une entrée dédiée, et les posts PROVISOIRE de l'épreuve deviennent VALIDE ou REJETE.

### TR3 — Tableau des médailles et écrans : saisie du journaliste avec recherche d'athlète par nom, consultation publique

### TR4 — Officiels authentifiés et correction d'un résultat officiel, avec réévaluation des posts

### TR5 — Résultats du site officiel des JOJ, à la place de l'entrée dédiée

### TR6 — Résumé du jour par un assistant IA

Un assistant IA rédige un paragraphe prêt à publier à partir des podiums VALIDE de la journée, ce qu'une simple liste ne donne pas au journaliste pressé. Règle : seuls ces podiums y sont cités ; un podium qui n'en fait pas partie est écarté.

### TR7 — Épreuves à deux bronzes (judo, boxe, lutte) et ex aequo

## Hors périmètre

- La modification ou la suppression d'un post ; en TR1, garder une trace des posts refusés.

## Hypothèses et risques

- Limite assumée : pas d'authentification en TR1 ; avant TR4, un résultat officiel faux dans les données de départ ou mal enregistré fait juger tous les posts de l'épreuve sur une erreur.
