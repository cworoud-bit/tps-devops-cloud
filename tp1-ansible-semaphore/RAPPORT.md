# Rapport TP1 : Déploiement d'un portfolio Next.js avec Ansible et Semaphore UI

**Étudiante :** Wrida (compte GitHub : `cworoud-bit`) · **Formation :** Master DevOps & Cloud

## 1. Objectif

Déployer un portfolio Next.js sur un serveur Ubuntu avec un playbook Ansible structuré en quatre rôles (`common`, `nodejs`, `app`, `nginx`), puis industrialiser son exécution avec Semaphore UI.

## 2. Architecture réalisée

| Élément | Détail |
| --- | --- |
| Serveur cible | Ubuntu local, `192.168.220.174`, accès SSH par clé, `sudo` sans mot de passe |
| Poste de contrôle | Ansible core 2.20, Git |
| Application | Next.js (dépôt `cworoud-bit/portfolio`), lancée par PM2 sur le port 3000 |
| Reverse proxy | Nginx, port 8090, vers `127.0.0.1:3000` |
| Semaphore UI | Docker (Semaphore + PostgreSQL), port 3001 |

Flux : Semaphore clone le dépôt `tps-devops-cloud`, exécute `site.yml`, qui installe Node.js 24 et PM2, clone et construit l'application, puis configure Nginx.

## 3. Travail réalisé

- **common** : cache apt, `git`, `curl`, `build-essential`, `acl`, création de l'utilisateur `deploy`.
- **nodejs** : dépôt NodeSource (`deb822_repository`), installation de Node.js et de PM2 (`community.general.npm`).
- **app** : clone du dépôt, `npm ci` et `npm run build` seulement si le code a changé (`when: app_git.changed`), démarrage PM2 si l'application n'existe pas, handler `restart app`.
- **nginx** : installation, template Jinja2 avec les en-têtes `Host`, `X-Real-IP`, `X-Forwarded-For`, activation du site, suppression du site par défaut, handler `reload nginx`.
- Toutes les valeurs sont dans `group_vars/all.yml` (`app_repo`, `app_port`, `node_major`, `nginx_port`, etc.).
- **Semaphore** : Magasin de clés (clé SSH), dépôt Git, inventaire statique, groupe de variables, modèle `Deploy Portfolio` avec variable d'enquête `app_version`.

## 4. Problèmes rencontrés et solutions

| Problème | Cause | Solution |
| --- | --- | --- |
| `sudo: interactive authentication is required` | `become = True` sans mot de passe sudo | Fichier `/etc/sudoers.d/wrida` (`NOPASSWD`) |
| Erreur au démarrage d'Ansible | Callback `yaml` supprimé de `community.general` 12 | `stdout_callback = default` + `result_format = yaml` |
| Nginx affichait la page par défaut / 404 | Ports 80 et 8080 occupés (proxy local, Jenkins) | Variable `nginx_port: 8090` dans le template et `group_vars` |
| Semaphore en `panic: unknown store type` | Base `bolt` non supportée par l'image récente | Migration vers PostgreSQL (`docker-compose.yml`) |
| Fichiers YAML corrompus | Contenu collé deux fois dans le terminal | Réécriture des fichiers, contrôle par `docker compose config` et `--syntax-check` |
| Clé SSH privée exposée | Affichée dans une capture d'écran | Régénération de la clé, mise à jour de GitHub et du Magasin de clés Semaphore |

## 5. Idempotence

Le premier passage applique les changements. Le **second passage** du playbook donne :

`ok=15  changed=0  unreachable=0  failed=0  skipped=4`

Elle repose sur les modules déclaratifs (`apt`, `user`, `git`, `template`, `file`, `service`), sur des tâches conditionnelles (`npm ci`, `build`, démarrage PM2 seulement si nécessaire) et sur des handlers (`restart app`, `reload nginx`).

## 6. Résultats et vérification

Après modification de la page d'accueil ("Wrida - Portfolio v2") et `git push`, une nouvelle exécution depuis Semaphore a terminé en **Success** (`ok=19 changed=6 failed=0`). Le handler `restart app` s'est déclenché (`changed`), ce qui confirme le redémarrage conditionnel. Le site est accessible sur `http://192.168.220.174:8090`.

Captures dans `captures/` : `semaphore-template.png`, `semaphore-run.png`, `portfolio.png`, `idempotence.png`.

## 7. Conclusion

Le déploiement est entièrement automatisé, reproductible et idempotent, et Semaphore UI permet de le relancer à la demande avec une version choisie (`app_version`). Pistes d'amélioration : HTTPS avec Let's Encrypt, secrets chiffrés avec Ansible Vault, déclenchement automatique par webhook Git.
