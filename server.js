const express = require('express');
const app = express();
const server = require('http').createServer(app);
const WebSocket = require('ws');

const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

let users = [];

// Configuration WebSocket
wss.on('connection', ws => {
    console.log('Client connected');
    
    ws.on('message', message => {
        const position = JSON.parse(message);
        const userIndex = users.findIndex(user => user.id === ws._socket.remoteAddress);

        if (userIndex === -1) {
            users.push({ id: ws._socket.remoteAddress, position });
        } else {
            users[userIndex].position = position;
        }

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(users));
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        users = users.filter(user => user.id !== ws._socket.remoteAddress);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(users));
            }
        });
    });
});

// Démarrage du serveur
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
