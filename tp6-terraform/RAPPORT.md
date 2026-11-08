# Rapport TP6 : Terraform et intégration Vagrant + Ansible

**Étudiante :** Wrida Chebbi · **Formation :** Master DevOps & Cloud

## 1. Objectif

Décrire une infrastructure de façon déclarative avec Terraform (provider Docker local, puis distant via SSH), puis enchaîner Vagrant, Ansible et Terraform pour déployer un CV One Page sur deux VM, avec un reverse proxy nginx comme point d'entrée unique (défi).

## 2. Architecture réalisée

| Élément | Détail |
| --- | --- |
| VM de lab (`vagrant-lab`) | VMware Workstation, Ubuntu 26.04 LTS, IP `192.168.220.141` |
| Outils | Terraform 1.17.1, Docker, Vagrant, VirtualBox, Ansible |
| Provider Terraform | `kreuzwerker/docker` version `~> 3.0` |
| VM invitées (partie 6) | `vm1` (`192.168.56.21`) et `vm2` (`192.168.56.22`), box `bento/ubuntu-24.04`, 1 Go de RAM chacune |
| Image du CV | `root04602/cv-onepage:latest` sur Docker Hub (nginx:alpine + `index.html`) |
| Reverse proxy | Conteneur nginx `cv-proxy` sur la VM de lab, port 8088 |

Flux de la partie 6 : `vagrant up` crée `vm1` et `vm2`, puis le provisioner Ansible installe Docker et Terraform sur chacune, copie `cv.tf` et lance `terraform apply`, qui démarre le conteneur du CV.

| VM | Port du conteneur | Accès depuis le PC |
| --- | --- | --- |
| vm1 | 8001 | `http://192.168.220.141:18001` |
| vm2 | 8002 | `http://192.168.220.141:18002` |
| proxy | 80 (publié en 8088) | `http://192.168.220.141:8088` |

## 3. Travail réalisé

- **Partie 5, Docker local :** `main.tf` avec `docker_image` et `docker_container` (nginx sur le port 8001). Cycle `init`, `fmt`, `validate`, `plan` (2 ressources à créer), `apply`, puis un second `apply` sans changement.
- **Variables :** `variables.tf` avec `external_port`. `terraform apply -var external_port=8002` a détruit et recréé le conteneur sur le port 8002, car le port d'un conteneur Docker ne se modifie pas en place.
- **Docker distant :** provider configuré avec `host = "ssh://vagrant@192.168.56.11:22"`. Le conteneur `nginx_remote` est créé sur la VM `lab1` du TP5 et répond sur `http://192.168.56.11:8001`. Il n'apparaît pas dans `docker ps` local, ce qui prouve qu'il a bien été créé à distance.
- **Intégration :** un `Vagrantfile` multi-machines, un playbook Ansible (`apt`, dépôt HashiCorp, Docker, Terraform, `terraform init` et `apply`) et `cv.tf` paramétré par la variable `cv_port`. Résultat : `ok=10 changed=7 failed=0` sur `vm1` et `vm2`, et `curl -I` renvoie `200 OK` sur les deux CV.
- **Défi, reverse proxy :** nginx avec un bloc `upstream` vers `192.168.56.21:8001` et `192.168.56.22:8002`. Les journaux des deux conteneurs montrent des requêtes sur chaque VM : le trafic est réparti en round-robin.

## 4. Difficultés rencontrées et solutions

| Problème | Cause | Solution |
| --- | --- | --- |
| `docker` et `terraform` introuvables sur la VM de lab | Installés seulement dans les VM invitées du TP5 | Installation de `docker.io` et `terraform`, ajout de l'utilisateur au groupe `docker`, reconnexion SSH |
| `Error: No configuration files` | `terraform plan` lancé dans un dossier sans `main.tf` | Création de `main.tf` avant `init` et `plan` |
| `REMOTE HOST IDENTIFICATION HAS CHANGED` vers `192.168.56.11` | La VM `lab1` avait été recréée avec la même IP, donc une nouvelle clé d'hôte | `ssh-keygen -R 192.168.56.11` ; `ssh_opts` désactive la vérification dans le provider (lab uniquement) |
| `curl` vers `192.168.56.21` en timeout depuis la VM de lab | Réseau privé VirtualBox momentanément injoignable après le redémarrage des VM | Rétabli après relance des VM ; en secours, passage par les ports redirigés 18001 et 18002 |
| Port 8002 occupé côté PC lors des tests | Conteneur `nginx_terraform` de la partie 5 | Ports redirigés distincts (18001 et 18002) pour les VM de la partie 6 |
| Le port d'un conteneur ne change pas en place | Limite de Docker | Terraform détruit puis recrée le conteneur (`1 to add, 1 to destroy`) |

## 5. Analyse

Terraform compare l'état souhaité (fichiers `.tf`) à l'état connu (`terraform.tfstate`) et ne calcule que la différence : un second `apply` sans modification répond « No changes ». Dans le lab, chaque outil garde son rôle : Vagrant crée les machines, Ansible les configure, Terraform déclare les ressources applicatives. Le fichier d'état, `.terraform/` et les secrets ne sont pas versionnés ; `.terraform.lock.hcl` l'est.

## 6. Captures (dossier `captures/`)

| Fichier | Contenu |
| --- | --- |
| `terraform-plan.png` | Sortie de `terraform plan` (2 ressources à créer) |
| `terraform-apply.png` | `terraform apply`, `docker ps` et `curl http://localhost:8001` |
| `terraform-remote.png` | Conteneur créé sur la VM distante via SSH |
| `integration-cv.png` | CV servi sur `vm1:8001` et `vm2:8002` |
| `reverse-proxy.png` | CV servi par le reverse proxy nginx |

Fichiers du projet : `main.tf`, `variables.tf`, `.terraform.lock.hcl`, `Vagrantfile`, `playbook.yml`, `terraform/cv.tf`, `proxy/nginx.conf`, `Dockerfile` et `index.html` du CV. Le fichier `terraform.tfstate` n'est pas versionné.
