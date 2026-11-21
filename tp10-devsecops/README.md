# TP10 : DevSecOps « Shift Left »

Application analysée : `vuln-app` (volontairement vulnérable), dépôt public https://github.com/cworoud-bit/vuln-app
Pipeline Jenkins : dépôt https://github.com/cworoud-bit/contact-api (Jenkinsfile de ce dossier).

## Contenu

- `vuln-app/` : code corrigé
- `security.yml`, `dependabot.yml`, `.trivyignore`, `Jenkinsfile`
- `captures/` : captures demandées

## Partie 1 : Gitleaks

| Règle | Fichier:ligne | Commit |
|---|---|---|
| `generic-api-key` | `src/config.js:5` | `3bb8354` |

Gitleaks n'a signalé que `jwt_secret`. Une relecture a révélé 3 autres secrets non détectés (règles basées sur l'entropie) : `payment_api_key` (`config.js:6`), `db_password` (`config.js:7`) et `ENV DB_PASSWORD` (`Dockerfile:6`). Un scanner ne remplace pas une relecture.

Après déplacement des secrets dans `process.env`, le secret reste détecté dans l'historique : Git conserve tous les commits, supprimer ou modifier le fichier ne suffit jamais. Pour un vrai secret : le **révoquer** (il est compromis), puis éventuellement réécrire l'historique (`git filter-repo`). Pour le lab, l'historique a été recréé (`rm -rf .git && git init`), avec un `.gitleaksignore` vide.

## Partie 2 : hook pre-commit

Le hook Gitleaks refuse le commit contenant `const token = "..."` (`generic-api-key`, `test-secret.js:1`). Note : `pre-commit autoupdate` modifie `.pre-commit-config.yaml` (rev v8.30.0) ; le fichier doit être commité avant de tester le hook.

## Partie 3 : Semgrep

| Règle | Fichier:ligne | Vrai positif ? | Correction |
|---|---|---|---|
| `raw-html-format`, `direct-response-write` | `src/server.js:32` | Oui (XSS réfléchi) | `res.json({ message })` |
| `github-actions-mutable-action-tag` (x5) | `security.yml` | Oui | Actions épinglées par SHA complet |
| `dockerfile.missing-user` | `Dockerfile:7` | Oui | `USER node` |
| *non détectés* : injection SQL | `server.js:21` | Oui (faux négatif) | requête paramétrée `?` |
| *non détectés* : injection de commande | `server.js:27` | Oui (faux négatif) | `execFile("ping", ["-c","1",host])` + validation |
| *non détectés* : JWT sans expiration | `server.js:43` | Oui (faux négatif) | `expiresIn: "1h"` |

Résultat : 7 findings avant, **0** après. Les règles communautaires ne couvrent pas tous les motifs (3 faux négatifs sur 4 failles applicatives).

## Partie 4 : dépendances et image

| Mesure | Avant | Après |
|---|---|---|
| `npm audit` (vuln-app) | 16 (1 critical, 10 high) | 5 high (`picomatch` via `node-gyp`, outil de build, absent de l'image runtime) |
| Trivy image | 597 HIGH/CRITICAL (Debian 10.13 : 566, Node : 31 ; 23 CRITICAL) | 0 |
| Trivy config | 2 échecs dont 1 HIGH (conteneur root) | 0 |

Corrections : image `node:24-alpine` multi-stage, `USER node`, aucun secret dans `ENV`, `HEALTHCHECK`, mise à jour de `express`, `lodash`, `sqlite3`, `jsonwebtoken`, `overrides` (`undici`, `brace-expansion`, `picomatch`), lockfile régénéré. Les 8 CVE résiduelles venaient de **npm embarqué dans l'image de base** (`/usr/local/lib/node_modules/npm`), inutile à l'exécution : il est supprimé dans l'image finale.

### Risque accepté

`CVE-2026-112366` (`picomatch`, ReDoS) : aucun correctif publié, dépendance transitive de build (`node-gyp` via `sqlite3`), non exposée par l'API. Décision datée du 2026-11-18, **réévaluation le 2026-12-18**, consignée dans `.trivyignore` avec `exp:2026-12-18`.
**Ignorer** = masquer sans trace. **Accepter un risque** = décision justifiée, datée, avec expiration et réévaluation.

## Partie 5 : GitHub

- Dependabot (npm + github-actions, hebdomadaire), alertes et security updates, Secret scanning et Push protection activés.
- `security.yml` : `permissions: contents: read` au niveau du workflow, `security-events: write` uniquement pour le job `sast`, Actions épinglées par SHA (`checkout` v7.0.1, `upload-sarif` v4.39.3). Un SHA de commit est immuable, alors qu'un tag peut être déplacé vers du code malveillant.
- Ruleset sur `main` : PR obligatoire, checks `secrets`, `sast`, `dependencies`, `image` obligatoires, force push interdit.

### Semgrep vs CodeQL

| Faille | Semgrep | CodeQL |
|---|---|---|
| Injection SQL | Non détectée | Non évaluée sur le code corrigé (code analysé = `main` corrigé) |
| Injection de commande | Non détectée | Non évaluée sur le code corrigé |
| XSS | Détectée (2 règles) | Non évaluée sur le code corrigé |
| Absence de rate limiting | Non | **Oui** (2 alertes High, `server.js:23` et `:31`) |

CodeQL analyse `main`, déjà corrigé : il n'a remonté que « Missing rate limiting ». Les deux outils sont complémentaires.

## Partie 6 : Jenkins

Stages ajoutés au Jenkinsfile : `Security` (Gitleaks, Semgrep, `npm audit` en parallèle) puis `Image scan` (Trivy `--severity CRITICAL --exit-code 1`), rapports archivés (`reports/**`).

- **Rouge** : `npm audit --audit-level=critical` échoue (8 vulnérabilités dont 2 critical dans `vitest`/`tinypool`). Le build s'arrête, Build image et Push sont sautés.
- **Vert** : mise à jour de `vitest` et `zod` (`found 0 vulnerabilities`), tous les stages passent.

Incidents : Semgrep en conteneur non-root plantait (`PermissionError: '/.semgrep'`), corrigé avec `-e HOME=/tmp` ; le token `github-pat` expiré (`Bad credentials`) a été régénéré.

## Captures

| Fichier | Contenu |
|---|---|
| `gitleaks.png` | Secret détecté par Gitleaks |
| `pre-commit-blocked.png` | Commit refusé par le hook |
| `semgrep-before-after.png` | Semgrep 7 findings puis 0 |
| `trivy-before-after.png` | Image et config avant / après |
| `dependabot-pr.png` | PR ouverte par Dependabot |
| `codeql-alerts.png` | Alertes CodeQL |
| `pr-blocked.png` | PR bloquée par un check obligatoire |
| `jenkins-security-rouge.png` | Pipeline Jenkins rouge |
| `jenkins-security-vert.png` | Pipeline Jenkins vert |
