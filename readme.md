# Hungry

## A simple web app for internal use to help family members decide what to eat

## Requirements

[nodejs](https://nodejs.org/)

### Installed by npm (node)

- express
- multer

## Instructions

1. Make sure node is installed
2. Clone repository
3. Install dependencies `npm ci`
4. Start webapp with node server.js
5. Navigate to <http://localhost:3101/upload.html>
6. Add desired choices
7. Webapp should be accesible from either <http://localhost:3101> or http://<internal IP>:3101
8. Optional on linux you can use systemd to make the webapp run on startup using hungry.service

**This should be installed as a user service @ ~/.config/systemd/user not a root service
It will start when the user logs in. If you prefer to start the service at boot modify so the
service does not run as root**
