# TP8 : API Express sécurisée et testée (Zod, Helmet, rate limiting, Vitest)

**Étudiante :** Wrida Chebbi · **Formation :** Master DevOps & Cloud

## 1. Objectif

Partir d'une API de formulaire de contact volontairement fragile, la rendre robuste (validation Zod, erreurs centralisées, Helmet, limite de taille et de débit), puis prouver cette robustesse avec des tests automatisés (Vitest, Supertest) et un test d'intégration contre PostgreSQL avec migrations.

## 2. Environnement

| Élément | Détail |
| --- | --- |
| VM de lab | Ubuntu Server 26.04 sous VMware (`vagrant-lab`) |
| Runtime | Node.js 24, Express 5 |
| Bibliothèques | `zod`, `helmet`, `express-rate-limit`, `pg` |
| Tests | Vitest, Supertest, couverture `@vitest/coverage-v8` |
| Base de données | PostgreSQL 17 (Docker Compose, port lié à `127.0.0.1`) |

## 3. OWASP API Security Top 10 (2023)

| Risque OWASP | Concerne notre API ? | Mesure dans ce TP |
| --- | --- | --- |
| API1 Broken Object Level Authorization | Non : aucun objet rattaché à un utilisateur, aucun identifiant dans l'URL | Sans objet |
| API2 Broken Authentication | Non : formulaire public, sans authentification | Sans objet (à ajouter si l'API devient privée) |
| API3 Broken Object Property Level Authorization | Oui : champs en trop acceptés (mass assignment) | `.strict()` dans le schéma Zod |
| API4 Unrestricted Resource Consumption | Oui : corps illimité, pas de limite de débit | `limit: "10kb"` et rate limiting (5 requêtes par minute) |
| API5 Broken Function Level Authorization | Non : une seule fonction publique | Sans objet |
| API6 Unrestricted Access to Sensitive Business Flows | Oui : envoi massif de messages (spam) | Rate limiting sur `/api/contact` |
| API7 Server Side Request Forgery | Non : l'API n'appelle aucune URL fournie par l'utilisateur | Sans objet |
| API8 Security Misconfiguration | Oui : stack trace, `x-powered-by`, headers de sécurité absents | Helmet, `errorHandler` sans stack, route 404 JSON |
| API9 Improper Inventory Management | Faible : une seule version exposée | Routes documentées dans ce README |
| API10 Unsafe Consumption of APIs | Non : aucun service tiers consommé | Sans objet |

Trois attaques que la version de départ laissait passer :

1. **Entrées invalides** : champs manquants, email incorrect, types inattendus, champs en trop. Tout était accepté (réponse 201).
2. **Divulgation d'informations** : un JSON mal formé renvoyait la stack trace complète, avec les chemins du serveur, et l'en-tête `X-Powered-By: Express` révélait la technologie.
3. **Abus de ressources** : aucune limite de débit ni de taille de corps, donc spam et saturation possibles.

## 4. Travail réalisé

**Validation et erreurs (partie 2).** Le schéma Zod impose `name` (trim, 2 à 100 caractères), `email` (format valide, 254 caractères maximum) et `message` (10 à 2000 caractères), avec `.strict()`. Le middleware `validate` répond `400 VALIDATION_ERROR` avec la liste `details` (`field`, `message`) et ne transmet à la route que les données validées. Le middleware d'erreur renvoie `INVALID_JSON` (400), `PAYLOAD_TOO_LARGE` (413) ou `INTERNAL_ERROR` (500), journalise l'erreur côté serveur et ne divulgue jamais la stack ni le message interne. Une route 404 JSON (`NOT_FOUND`) précède ce middleware.

**Durcissement HTTP (partie 3).** `x-powered-by` est désactivé, Helmet ajoute notamment `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` et `X-Frame-Options`. Le corps JSON est limité à 10 ko. `express-rate-limit` s'applique uniquement à `/api/contact` : 5 requêtes par minute et par IP, avec les en-têtes `RateLimit-*` standard. Le limiteur est placé avant le parsing du corps, il protège donc aussi contre les requêtes invalides répétées.

**Tests de routes (partie 4).** Les 11 `it.todo` sont devenus de vrais tests, plus un test de route 404 : 14 tests passent au total (1 de santé, 13 sur `/api/contact`). Cas négatifs couverts : email invalide, champ manquant, champ en trop, mauvais types, JSON tronqué, corps de plus de 10 ko, tentative d'injection SQL, erreur 500 sans fuite d'information, headers Helmet, absence de `x-powered-by`, limite de débit.

**Intégration PostgreSQL (partie 5).** Base lancée avec `docker compose up -d --wait`, migration `001_create_contacts.sql` appliquée par `npm run migrate` (le script mémorise les migrations déjà jouées, donc une seconde exécution ne fait rien). Deux tests d'intégration passent : l'enregistrement d'un contact valide, vérifié par une requête SQL, et une tentative d'injection SQL dans `name` qui laisse la table `contacts` intacte et stocke la valeur telle quelle.

## 5. Résultats

| Mesure | Résultat |
| --- | --- |
| `npm test` | 14 tests passés, plus aucun `todo` |
| `npm run test:integration` | 2 tests passés |
| Couverture globale | 71,42 % des instructions, 82,6 % des branches, 60 % des fonctions |
| Couverture `src/app.js`, routes, schéma, middlewares | 100 % des instructions |
| Boucle de 7 requêtes sur `/api/contact` | 201 pour les premières, puis 429 |

La couverture globale est abaissée par `migrate.js` et `server.js` (0 %, jamais importés par les tests de routes) et par la partie PostgreSQL de `contactRepository.js`, qui n'est exercée que par le test d'intégration.

Test manuel avec `curl` : une requête valide est enregistrée (201), une requête invalide renvoie `VALIDATION_ERROR` (400), et un nom contenant `Robert'); DROP TABLE contacts;--` est stocké tel quel sans endommager la table, grâce aux requêtes paramétrées (`$1`, `$2`, `$3`).

## 6. Difficultés rencontrées

| Problème | Cause | Solution |
| --- | --- | --- |
| 11 tests sur 14 en échec au premier lancement | Le code des parties 2 et 3 n'avait pas encore été appliqué : l'API était toujours la version fragile du starter (réponses 201 sur entrées invalides, 500 sur JSON cassé, stack trace visible) | Application du code complet, puis les 14 tests passent |
| Vérification trompeuse avec `grep -c helmet` | Le mot « helmet » figurait déjà dans les commentaires `TODO` du starter | Contrôle par `grep -n "TODO"` : plus aucun TODO après correction |
| Test d'intégration impossible sans base | Variables `PG*` non exportées dans le terminal | `set -a; . ./.env; set +a` avant `npm run migrate` et `npm start` |

## 7. Captures (dossier `captures/`)

| Fichier | Contenu |
| --- | --- |
| `validation-400.png` | Requête invalide et réponse `VALIDATION_ERROR` détaillée |
| `helmet-headers.png` | `curl -I` avant et après Helmet |
| `rate-limit-429.png` | Boucle `curl` se terminant par des 429 |
| `tests-ok.png` | `npm test` : 14 tests passés, plus de `todo` |
| `coverage.png` | Rapport de couverture |
| `integration-ok.png` | `npm run test:integration` contre PostgreSQL |

Fichiers du rendu : `src/`, `tests/`, `migrations/`, `package.json`, `package-lock.json`, `compose.yaml`, `.env.example` (sans `.env`).
