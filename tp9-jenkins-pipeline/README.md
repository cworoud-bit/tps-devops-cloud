# TP9 : Pipeline as Code avec Jenkins

## Objectif

Décrire un pipeline CI/CD dans un `Jenkinsfile` versionné et l'exécuter avec Jenkins : agents Docker, stages parallèles, rapports JUnit, credentials, image taguée avec le Git SHA, puis job Multibranch relié à GitHub.

- Dépôt de l'application : https://github.com/cworoud-bit/contact-api
- Image Docker Hub : `root04602/contact-api`

## Contenu du dossier

- `Jenkinsfile` : pipeline final
- `captures/` : captures demandées par le TP

## Pipeline réalisé

Stages : Checkout → Install → Quality (Lint ‖ Unit tests) → Build image → Push → post.

- **Agents Docker** : Install, Lint et Unit tests s'exécutent dans `node:24-alpine` (`reuseNode true` pour partager le workspace).
- **Parallélisme** : Lint et Unit tests tournent en parallèle.
- **Rapport JUnit** : Vitest produit `reports/junit.xml`, publié dans `post { always { junit ... } }`.
- **Tag par Git SHA** : l'image est `root04602/contact-api:<SHORT_SHA>` avec le label `org.opencontainers.image.revision`. Le fichier `image.txt` est archivé.
- **Credentials** : le credential `dockerhub` (access token) est injecté avec `withCredentials`. Les `sh` utilisent des guillemets simples, le token apparaît en `****` dans la console.
- **Push conditionnel** : l'image n'est poussée que depuis `main`.
- **Options** : `disableConcurrentBuilds()`, `timestamps()`, `timeout` de 20 minutes.

## Multibranch Pipeline

Job `contact-api-multibranch` relié à GitHub avec un credential `github-pat` (token en lecture seule). Le scan périodique (2 minutes) remplace le webhook, car la VM n'est pas joignable depuis Internet.

Résultat observé :

- `main` : Push exécuté
- `feature/rate-limit-config` et `PR` : Push sauté (`skipped`)
- Après le merge de la PR #1 : build `main` avec Push vert

Remarque : le job `PR-1` disparaît de Jenkins une fois la PR mergée. Une seconde PR (`PR-2`) a donc été ouverte pour la capture.

## Problèmes rencontrés et solutions

1. **Échec de `npm ci` : `EIDLETIMEOUT` sur `registry.npmjs.org`**
   Cause : réseau de la VM instable (builds #4 et PR-1). Solution : redémarrage de la VM, et dans le Jenkinsfile `retry(2)` avec `npm ci --fetch-retries=5 --fetch-timeout=60000`.

2. **`GIT_BRANCH=null`, Push toujours sauté**
   Cause : avec un `checkout` manuel (`skipDefaultCheckout`), les variables `GIT_*` ne sont pas injectées dans `env`. Solution : `def scmVars = checkout scm` puis affectation de `env.GIT_BRANCH`, `env.GIT_COMMIT` et `env.SHORT_SHA`. Le `when` du Push accepte `BRANCH_NAME` (Multibranch) ou `GIT_BRANCH` (job simple).

3. **Branche absente du Multibranch**
   Cause : stratégie *Exclude branches that are also filed as PRs*. Solution : *All branches*.

4. **Statut GitHub `pr-head` rouge (« This commit cannot be built »)**
   Cause : le build de la PR avait échoué à cause du problème n°1. Résolu après correction du réseau.

5. **`--exclude tests/integration/**` sans guillemets**
   Le shell développait le glob. Solution : guillemets simples autour du motif.

## Captures

| Fichier | Contenu |
|---|---|
| `pipeline-stages.png` | Vue des stages, Lint et Unit tests en parallèle |
| `junit-report.png` | Onglet Tests : test en échec puis corrigé |
| `credentials-masked.png` | Console avec le token masqué (`****`) |
| `dockerhub-sha-tag.png` | Tag `contact-api:<sha>` sur Docker Hub et `git rev-parse --short HEAD` |
| `multibranch.png` | Jobs `main`, `feature/...` et `PR-2` (capture assemblée : onglets Branches et Pull Requests) |

## Conclusion

Le pipeline décrit dans le `Jenkinsfile` construit, teste et publie l'image uniquement depuis `main`, et le Multibranch construit chaque branche et chaque Pull Request.
