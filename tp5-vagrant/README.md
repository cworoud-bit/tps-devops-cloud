# TP5 : Environnements de lab avec Vagrant

> Master DevOps & Cloud

Décrire des machines virtuelles dans un `Vagrantfile` et les créer avec **Vagrant** + VirtualBox (virtualisation imbriquée sous Hyper-V), puis les configurer avec **Ansible** pour monter un lab de 2 VM (Jenkins, Docker, Portainer, conteneur web).

![Virtualisation imbriquée](images/vagrant-nested-virtualization.svg)

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
# Sur la VM de lab (virtualisation imbriquée activée)
grep -Ec '(vmx|svm)' /proc/cpuinfo        # doit être > 0
vagrant --version && VBoxManage --version

mkdir -p ~/vagrant_demo/web && cd ~/vagrant_demo
vagrant init bento/ubuntu-24.04
vagrant up && vagrant ssh
```

Puis suivez la démo et le lab de [`TP.md`](TP.md).

## Prérequis

- Hôte Windows avec Hyper-V
- VM de lab Ubuntu 26.04 : ≥ 4 vCPU, ≥ 8 Go de RAM, ≥ 60 Go de disque, virtualisation imbriquée activée
- Les rôles Ansible et l'image Docker du [TP4](../tp4-ansible-bases/)

## Livrables

1. Le dossier du lab (`Vagrantfile`, playbook, `roles/`, `docker-compose.yml`)
2. Captures dans `captures/` :
   - `nested-virt.png`, `vagrant-demo.png`, `vagrant-status.png`, `lab-services.png`
