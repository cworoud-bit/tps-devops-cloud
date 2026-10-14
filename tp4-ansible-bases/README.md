# TP4 : Bases d'Ansible

> Master DevOps & Cloud

Prendre en main **Ansible** pas à pas : inventaire, `ansible.cfg`, premier playbook idempotent, authentification SSH par clé, puis installation de Jenkins, Docker, Portainer et d'un conteneur applicatif, organisée en **rôles**.

![Architecture Ansible](images/ansible-architecture.svg)

## Contenu du dossier

```
.
├── README.md      ← cette page
├── TP.md          ← énoncé complet du TP
├── images/        ← schémas de l'énoncé
└── captures/      ← vos captures d'écran (livrables)
```

## Démarrage rapide

```bash
# Sur le nœud de contrôle
sudo apt update && sudo apt install -y ansible sshpass
mkdir -p ~/ansible/demo1 && cd ~/ansible/demo1

# Après avoir écrit inventory.txt (partie 0 du TP)
ansible all -i inventory.txt -m ping -k
```

Puis suivez les parties 1 à 5 de [`TP.md`](TP.md).

## Prérequis

- 3 VM Ubuntu Server 26.04 sur le même réseau : 1 nœud de contrôle + 2 nœuds gérés
- Un utilisateur commun (ex. `devops`) avec `sudo` et SSH actif sur les nœuds
- Un compte Docker Hub pour la partie 4 (ou construction locale de l'image)

## Livrables

1. Le dossier `demo1/` (inventaire, `ansible.cfg`, playbooks, `roles/`, `Dockerfile`, `docker-compose.yml`)
2. Captures dans `captures/` :
   - `ping-pong.png`, `playbook-run.png`, `idempotence.png` (2ᵉ run à `changed=0`), `ssh-keys.png`, `containers.png`, `roles-run.png`
