# Rapport TP5 : Environnements de lab reproductibles avec Vagrant

**Étudiante :** Wrida · **Formation :** Master DevOps & Cloud

## 1. Objectif

Décrire des machines virtuelles dans un `Vagrantfile`, les créer avec Vagrant et VirtualBox (virtualisation imbriquée sous VMware), puis les configurer avec Ansible pour monter un lab de 2 VM hébergeant Jenkins, Docker, Portainer et un conteneur web.

## 2. Architecture réalisée

| Élément | Détail |
| --- | --- |
| VM de lab (`vagrant-lab`) | VMware Workstation, Ubuntu 26.04 LTS, IP `192.168.220.141`, environ 7 Go de RAM, 48 Go de disque |
| Outils | Vagrant 2.4.9, VirtualBox 7.2.6, Ansible core 2.21.5 |
| Box | `bento/ubuntu-24.04` (v202510.26.0) |
| VM invitées | `lab1` (`192.168.56.11`) et `lab2` (`192.168.56.12`), 2 Go de RAM et 1 CPU chacune, réseau `private_network` |
| Provisionnement | Provisioner `ansible` du `Vagrantfile`, playbook `playbook.yml` et trois rôles du TP4 |

Rôles réutilisés du TP4 : `jenkins_install`, `docker_portainer_install`, `container_deployment`.

Redirections de ports (vers la VM de lab) :

| Service | lab1 | lab2 |
| --- | --- | --- |
| Jenkins | 8080 | 8082 |
| Site web (conteneur) | 8081 | 8083 |
| Portainer | 9443 | 9444 |

Flux : `vagrant up` crée `lab1` et `lab2`, puis lance Ansible une seule fois, après le démarrage des deux VM, avec `a.limit = "all"` et le groupe `nodes`.

## 3. Travail réalisé

- **Virtualisation imbriquée :** `grep -Ec '(vmx|svm)' /proc/cpuinfo` renvoie 8, donc supérieur à 0. VirtualBox et Vagrant sont installés.
- **Démo `vagrant_demo` :** VM `bento/ubuntu-24.04` avec Apache installé par un script shell, dossier `web/` synchronisé avec `/var/www/html` et port 80 redirigé vers 8080. La page « Bonjour depuis Vagrant » s'affiche depuis le PC physique. La VM est ensuite détruite avec `vagrant destroy -f`.
- **Lab de 2 VM :** `Vagrantfile` multi-machines (boucle sur un dictionnaire de nœuds) et playbook `playbook.yml` repris de `site_roles.yml` du TP4. Résultat du provisionnement : `ok=20 changed=12 unreachable=0 failed=0` sur `lab1` et sur `lab2`.
- **Vérifications :** Jenkins répond (page de déverrouillage), le site « Bonjour Master DevOps & Cloud » répond sur 8081, Portainer est configuré sur `lab1` (environnement local, 2 conteneurs sur 2).

Le message `pull access denied for demo-web` pendant Docker Compose n'est pas une erreur : l'image n'existe pas sur Docker Hub, Compose la construit alors localement à partir du `Dockerfile`.

## 4. Difficultés rencontrées et solutions

| Problème | Cause | Solution |
| --- | --- | --- |
| VMware : `scoreboard file establishment failed`, puis VM suspendue en plein `vagrant up` | Disque C: de l'hôte Windows plein à 100 % | Libération d'espace sur C: (corbeille, fichiers temporaires, VM inutilisées), puis relance |
| `JSON::ParserError: unexpected token at ''` à chaque commande `vagrant` | Fichiers d'état de `.vagrant/` vides, écrits au moment de l'arrêt brutal de la VM (`box_meta`, `private_key`...) | Suppression de `.vagrant/` et de la VM VirtualBox incomplète, puis nouveau `vagrant up` |
| Port 8080 déjà utilisé, redirection impossible | Jenkins déjà installé sur la première VM de lab | Utilisation d'une VM de lab propre, ports 8080 à 9444 libres et vérifiés avec `ss -tlnp` |
| SSH vers la VM de lab en `Connection timed out` alors que le `ping` répondait | Service SSH non actif au démarrage | Démarrage et activation du service (`systemctl enable ssh`), vérification du pare-feu |
| Portainer : `instance timed out` puis `403` à la création du compte | Portainer se verrouille 5 minutes après son démarrage et exige un setup token propre à chaque instance | `docker restart portainer`, lecture du token dans les logs, création du compte immédiatement |
| Portainer : « Client sent an HTTP request to an HTTPS server » | URL ouverte en `http` | Utilisation de `https://` |
| Disque et RAM de la première VM insuffisants pour deux VM, Jenkins et Docker | VM de lab déjà chargée par d'autres TP | Nouvelle VM de lab dédiée (6 Go de RAM disponibles, 28 Go de disque libres) |

## 5. Analyse

Vagrant décrit les **machines** (nombre, réseau, ressources, ports) et Ansible décrit leur **configuration**. Le même `Vagrantfile` et les mêmes rôles recréent le lab à l'identique avec `vagrant destroy` puis `vagrant up`, ce qui rend l'environnement reproductible. Le coût est de plus de ressources (RAM, disque) et d'un temps de montage de 15 à 30 minutes pour le premier `vagrant up`. La virtualisation imbriquée ajoute une couche de fragilité, comme le montrent les incidents de disque et de verrous.

## 6. Captures (dossier `captures/`)

| Fichier | Contenu |
| --- | --- |
| `nested-virt.png` | `grep -Ec '(vmx\|svm)' /proc/cpuinfo` supérieur à 0 et `vagrant --version` |
| `vagrant-demo.png` | Page de `vagrant_demo` ouverte depuis le PC physique (port 8080) |
| `vagrant-status.png` | `vagrant status` avec `lab1` et `lab2` en `running` |
| `lab-services.png` | Jenkins, Portainer et conteneur web accessibles |

Dossier du lab : `Vagrantfile`, `playbook.yml`, `roles/`, `docker-compose.yml`, `Dockerfile`, `index.html`.
