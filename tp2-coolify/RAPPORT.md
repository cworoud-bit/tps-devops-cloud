# Rapport TP2 : Déploiement d'un portfolio Next.js avec Coolify et Forgejo

**Étudiante :** Wrida · **Formation :** Master DevOps & Cloud

## 1. Objectif

Installer Coolify (PaaS auto-hébergé) et Forgejo (forge Git auto-hébergée) dans une VM locale, déployer le portfolio Next.js depuis un dépôt Forgejo, puis automatiser le redéploiement à chaque `git push` grâce à un webhook, et pratiquer le rollback.

## 2. Architecture réalisée

| Élément | Détail |
| --- | --- |
| VM | VMware Workstation, Ubuntu 26.04 LTS, IP `192.168.220.134`, disque 30 Go |
| Coolify | v4.4.6, dashboard sur le port 8000, Traefik sur le port 80 |
| Forgejo | Docker Compose, web sur le port 3001, SSH sur le port 2222 |
| Build | Railpack, application exposée sur le port 3000 |
| Nom d'hôte | `portfolio.coolify.local`, déclaré dans le fichier `hosts` de Windows |

Flux : `git push` → Forgejo → webhook → Coolify → build et déploiement → Traefik → `http://portfolio.coolify.local`.

## 3. Travail réalisé

- **Partie A :** Coolify installé, compte administrateur créé, serveur `localhost` joignable et proxy Traefik démarré.
- **Partie B :** Forgejo démarré avec `FORGEJO__webhook__ALLOWED_HOST_LIST=external,private`, dépôt public `wrida/portfolio` créé, code du portfolio poussé.
- **Partie C :** ressource « Public Repository » (URL avec l'IP de la VM), branche `main`, port exposé 3000, domaine `http://portfolio.coolify.local`. Déploiement réussi, site accessible.
- **Partie D :** webhook Gitea/Forgejo vers Coolify avec secret partagé, option « Deploy on push », test de livraison réussi. Une modification poussée sur `main` déclenche un déploiement sans intervention.
- **Rollback :** erreur de build volontairement poussée, déploiement en échec alors que l'ancienne version restait en ligne, puis `git revert` et nouveau push : déploiement réussi.

## 4. Difficultés rencontrées et solutions

| Problème | Cause | Solution |
| --- | --- | --- |
| SSH vers la VM en timeout | Carte réseau VMware (VMnet) désactivée sous Windows | Réactivation de la carte |
| Premier déploiement en échec | Disque `/` presque plein (14 Go alloués sur 30 Go) | `lvextend -r -l +100%FREE` : volume porté à 28 Go |
| `404` sur `portfolio.coolify.local` | Aucun déploiement réussi, donc aucune route Traefik | Nouveau déploiement après correction du disque |
| Webhook inatteignable | L'URL proposée par Coolify contenait l'IP publique | URL saisie à la main dans Forgejo avec l'IP privée `192.168.220.134` |
| `Add-Content` introuvable | Commande PowerShell tapée dans la VM Linux | Modification du `hosts` depuis PowerShell administrateur sur Windows |
| `Authentication failed` sur le push | Mot de passe Forgejo incorrect | Réinitialisation avec `forgejo admin user change-password` |
| Écart avec l'énoncé | VM en Ubuntu 26.04 au lieu de 24.04 | Aucun impact constaté sur Coolify ni Forgejo |

## 5. Comparaison TP1 (Ansible + Semaphore) et TP2 (Coolify + Forgejo)

| Critère | TP1 : approche IaC | TP2 : approche PaaS |
| --- | --- | --- |
| Configuration | Rôles YAML écrits à la main | Interface web, formulaires |
| Contrôle | Total (paquets, versions, ports, nginx) | Limité, Coolify décide du build et du proxy |
| Mise en place | Longue (écriture et débogage des rôles) | Rapide (script d'installation et quelques clics) |
| Redéploiement | Lancement du playbook depuis Semaphore | Automatique par webhook à chaque push |
| Rollback | Manuel (`git revert` puis relance du playbook) | Intégré, l'ancienne version reste en ligne si le build échoue |
| Idempotence | Explicite et vérifiable (`changed=0`) | Implicite (nouveau conteneur à chaque déploiement) |
| Reproductibilité | Forte, tout est dans Git | Dépend de la configuration saisie dans l'interface |
| Courbe d'apprentissage | Plus raide (Ansible, Jinja2, modules) | Faible |
| Cas d'usage | Infrastructure sur mesure, plusieurs serveurs, conformité | Applications web, équipes qui veulent livrer vite |

## 6. Conclusion

Le PaaS réduit fortement le temps de mise en production et fournit webhook et rollback sans effort, au prix d'un contrôle moindre. L'approche IaC demande plus de travail mais offre une infrastructure entièrement décrite, versionnée et reproductible. Les deux approches sont complémentaires : Coolify pour livrer rapidement une application, Ansible pour maîtriser et documenter l'infrastructure.

## 7. Captures (dossier `captures/`)

`coolify-dashboard.png`, `forgejo-repo.png`, `coolify-config.png`, `coolify-deploy.png`, `portfolio.png`, `forgejo-webhook.png`, `coolify-autodeploy.png`, `coolify-rollback.png`.
