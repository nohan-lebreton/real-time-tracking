# Real-Time Tracking Application

## Repository GitHub

- [Repo-Git-Real-Time-Tracking](https://github.com/nohan-lebreton/real-time-tracking)
## Description

L'application Real-Time Tracking est une application web permettant le suivi en temps réel de la position des utilisateurs, l'affichage des données de l'accéléromètre et la communication vidéo entre utilisateurs. Elle utilise WebSockets pour une communication en temps réel, Leaflet pour la carte, et WebRTC pour les flux vidéo.

## Fonctionnalités

- Suivi en temps réel de la position des utilisateurs. 
- Affichage des données de l'accéléromètre.
- Liste des utilisateurs connectés.
- Flux vidéo en temps réel avec les autres utilisateurs. (je suis resté bloqué sur cette partie pour recuper la video de l'utilisateur disatant)

## Technologies Utilisées

- HTML, CSS, JavaScript pour le frontend.
- Node.js, Express et WebSocket pour le backend.
- Leaflet pour l'affichage de la carte.(car j'ai eu des probleme pour avoir accès a une clef api gogole maps)
- WebRTC pour la communication vidéo.
- Bootstrap pour le style.

## Utilisation

1. **Ouvrez votre navigateur** et accédez à `https://nohan.lebreton.caen.mds-project.fr/`.

2. **Connexion** Entrez votre nom d'utilisateur et cliquez sur le bouton "Connect" (autorisez l'accès à votre camera et a l'accelerometre pour iphone) afin de voir votre position sur la carte et celle des autres utilisateurs connectés.

3. **Visio** Sur la liste des utilisateurs connectés, cliquez sur le bouton "view camera" pour démarrer un appel vidéo avec un autre utilisateur. 
