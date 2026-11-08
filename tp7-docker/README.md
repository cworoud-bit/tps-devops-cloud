# TP7 : Docker avancé et Docker Compose (multi-stage, non-root, PostgreSQL)

**Étudiante :** Wrida Chebbi · **Formation :** Master DevOps & Cloud

## 1. Objectif

Produire des images petites, reproductibles et sûres (multi-stage, utilisateur non-root, `HEALTHCHECK`), les comparer à une image naïve, décrire une pile complète avec Docker Compose (application, PostgreSQL, Adminer), puis construire une image multi-architecture avec Buildx.

## 2. Environnement

| Élément | Détail |
| --- | --- |
| VM de lab | Ubuntu Server 26.04 sous VMware (`vagrant-lab`) |
| Application | API Express/TypeScript, compteur de visites dans PostgreSQL |
| Images de base | `node:24` (naïve), `node:24-alpine` (multi-stage), `postgres:17-alpine`, `adminer:5`, `nginx:alpine` |
| Compte Docker Hub | `root04602` |

## 3. Tableau comparatif

| Indicateur | naive | multistage |
| --- | --- | --- |
| Taille de l'image | 1,67 Go (contenu : 417 Mo) | 250 Mo (contenu : 63,3 Mo) |
| Temps de build (à froid) | 13,6 s | 50,1 s |
| Temps de build (code modifié) | 11,98 s | 7,3 s |
| Vulnérabilités HIGH/CRITICAL | 488 (468 HIGH, 20 CRITICAL) | 0 |
| Utilisateur | root (`uid=0`) | `node` (`uid=1000`) |

Remarques :

- Le build « à froid » du multi-stage est plus long car il a téléchargé `node:24-alpine` et le frontend `docker/dockerfile:1`, alors que `node:24` était déjà en cache local pour l'image naïve. La comparaison n'est donc pas équitable sur ce point ; l'avantage du multi-stage apparaît au rebuild.
- Au rebuild avec code modifié, l'étape `npm ci` est `CACHED` : seules les étapes `COPY src` et `npm run build` sont rejouées.
- Vulnérabilités de l'image naïve : 482 dans le système Debian (462 HIGH, 20 CRITICAL) et 6 HIGH dans les paquets Node (`undici`, `brace-expansion`).

## 4. Réponses aux questions

**Pourquoi `npm install` est-il réexécuté après modification de `src/server.ts` (image naïve) ?** Parce que `COPY . .` précède `npm install`. Le fichier modifié change la couche `COPY`, ce qui invalide le cache de cette couche et de toutes les suivantes.

**Pourquoi le multi-stage est-il plus petit et plus sûr ?** L'image finale ne contient que `dist/`, les dépendances de production et `package.json`, sur une base Alpine. Les sources, les devDependencies, TypeScript et la couche Debian complète n'y sont pas. Le processus tourne en non-root.

**Que fait `docker compose down -v` ?** Il supprime les conteneurs, les réseaux et aussi les volumes nommés, donc `pgdata` : le compteur de visites repart de zéro. Sans `-v`, le volume est conservé.

**Persistance.** Le compteur est passé de 2 à 4 après `docker compose down` puis `up -d`, avec un nouvel identifiant de conteneur dans le champ `host`.

**Isolation réseau.** `db` n'est que sur le réseau `backend` et aucun port n'est publié (`5432/tcp` seulement, visible dans `docker compose ps`). `app` est sur `frontend` et `backend` ; Adminer est sur `backend`.

**Problème avec `--scale app=2` et `ports: "3000:3000"` ?** Deux conteneurs ne peuvent pas publier le même port hôte : le démarrage échoue avec « port is already allocated ». Solution : retirer `ports` de `app` et placer un reverse proxy Nginx devant (défi).

## 5. Pile Compose

- `db` : volume nommé `pgdata`, healthcheck `pg_isready`, réseau `backend` uniquement.
- `app` : variables lues dans `.env`, `depends_on` avec `condition: service_healthy`, réseaux `frontend` et `backend`.
- `adminer` : réseau `backend`, accessible sur le port 8080.
- Le fichier `.env` n'est pas versionné ; `.env.example` fournit les noms des variables.

## 6. Buildx et multi-architecture

```bash
docker run --privileged --rm tonistiigi/binfmt --install arm64
docker buildx create --name multiarch --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t root04602/visits-app:1.0.0 --push .
docker buildx imagetools inspect root04602/visits-app:1.0.0
```

L'index de l'image `root04602/visits-app:1.0.0` liste les manifests `linux/amd64` et `linux/arm64`. Les deux manifests `unknown/unknown` sont les attestations (provenance) ajoutées par BuildKit.

## 7. Défi : reverse proxy Nginx

Nginx est le seul service publié sur le port 80 ; `app` n'expose plus de port hôte. Avec `docker compose up -d --scale app=3`, six requêtes `curl` consécutives sont servies par trois conteneurs différents (trois valeurs distinctes du champ `host`), avec un compteur de visites commun.

## 8. Difficultés rencontrées

| Problème | Cause | Solution |
| --- | --- | --- |
| `WARN: POSTGRES_USER variable is not set` | Fichier `.env` absent | Création de `.env` à partir de `.env.example`, ajouté au `.gitignore` |
| Réseau `visits_default` créé, pas de volume ni de healthcheck | `compose.yaml` resté à l'état du squelette | Réécriture complète de `compose.yaml` |
| Adminer : connexion refusée | Système MySQL sélectionné au lieu de PostgreSQL | Choix de PostgreSQL, serveur `db`, utilisateur `visits` |
| `context deadline exceeded` au démarrage du builder Buildx | Téléchargement lent de l'image BuildKit | Nouvelle initialisation du builder après le téléchargement |
| `--scale app=2` échoue | Port hôte 3000 publié en double | Reverse proxy Nginx, sans port publié sur `app` |

## 9. Captures (dossier `captures/`)

| Fichier | Contenu |
| --- | --- |
| `image-comparison.png` | `docker image ls visits-app` : naive et multistage |
| `non-root.png` | `docker run --rm visits-app:multistage id` |
| `compose-ps.png` | `docker compose ps`, `db` en `healthy` |
| `persistence.png` | Compteur conservé après `down` puis `up` |
| `buildx-manifest.png` | `docker buildx imagetools inspect` : amd64 et arm64 |
| `reverse-proxy.png` | Réponses de trois conteneurs différents |

Fichiers du rendu : `Dockerfile`, `.dockerignore`, `compose.yaml`, `nginx.conf`, `.env.example` (sans `.env`).
