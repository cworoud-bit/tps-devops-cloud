# TP2 : Déploiement d'un Portfolio Next.js avec Coolify et Forgejo

> Master DevOps & Cloud

Installer **Coolify** (PaaS open source, alternative à Heroku / Netlify / Vercel) et **Forgejo** (forge Git auto-hébergée) dans une VM Ubuntu locale, puis déployer le portfolio Next.js avec **redéploiement automatique** à chaque `git push` (webhook Forgejo → Coolify).

![Architecture](images/coolify-architecture.svg)

## Contenu

```
tp2-coolify/
├── README.md
├── TP.md                     ← énoncé complet
├── forgejo/
│   └── docker-compose.yml    ← Forgejo prêt à lancer
├── images/                   ← schémas et maquette
└── captures/                 ← vos captures d'écran (livrables)
```

## Démarrage rapide

```bash
# Dans la VM Ubuntu 24.04 (2 vCPU, 4 Go RAM recommandés)

# 1. Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
#    -> http://<IP-VM>:8000 : créer le compte administrateur

# 2. Forgejo
cd forgejo && docker compose up -d
#    -> http://<IP-VM>:3001 : assistant d'installation, puis dépôt « portfolio »
```

Sur votre poste, déclarez un nom d'hôte local dans le fichier `hosts` :

```
<IP-VM>  portfolio.coolify.local
```

Dans Coolify : dépôt `http://<IP-VM>:3001/<utilisateur>/portfolio.git`, domaine `http://portfolio.coolify.local` (HTTP, sans certificat). Le webhook se configure dans la partie D du [`TP.md`](TP.md).

## Prérequis

- Hyperviseur (VirtualBox, VMware, Hyper-V, Multipass…) et une VM Ubuntu 24.04 **dédiée**
- IP de la VM joignable depuis votre poste, accès Internet sortant depuis la VM (npm, images Docker)
- Le code du portfolio Next.js du TP1 sur votre poste, avec Git

## Livrables

1. Captures dans `captures/` : `coolify-dashboard.png`, `forgejo-repo.png`, `coolify-config.png`, `coolify-deploy.png`, `portfolio.png`, `forgejo-webhook.png`, `coolify-autodeploy.png`, `coolify-rollback.png`
2. `RAPPORT.md` : tableau comparatif TP1 / TP2 et difficultés rencontrées
