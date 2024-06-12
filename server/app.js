/* This code snippet is setting up a server using Node.js with Express for handling HTTP requests,
WebSocket for real-time communication, and UUID for generating unique identifiers. Here's a
breakdown of what each part does: */
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/* `app.use(express.static('public'));` is setting up a middleware in the Express application to serve
static files from the 'public' directory. This means that any files (like HTML, CSS, images, etc.)
placed in the 'public' directory can be accessed by clients making HTTP requests to the server. This
middleware allows you to serve static content without having to write specific routes for each file,
making it a convenient way to serve assets like stylesheets, scripts, and images. */
app.use(express.static('public'));

/* `let users = [];` is initializing an empty array named `users`. This array is used to store
information about users who connect to the server via WebSocket. Each user's data is stored as an
object in this array, and various operations are performed on this array based on the messages
received from clients. */
let users = [];
/* The code block you provided is an event listener attached to the WebSocket Server (`wss`) for
handling client connections. Here's a breakdown of what it does: */

wss.on('connection', ws => {
    console.log('Client connected');
    let userId = uuidv4();
    let userData;

    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            if (data.disconnect) {
                users = users.filter(user => user.id !== data.id);
                broadcastUsers();
            } else if (data.type === 'user') {
                userData = { ...data, id: userId, connectedAt: new Date().toLocaleTimeString() };
                users = users.filter(user => user.id !== userId);
                users.push(userData);
                broadcastUsers();
            } else if (data.type === 'signal') {
                broadcastSignal(data);
            } else if (data.type === 'accelerometer') {
                handleAccelerometerData(data);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (userData) {
            users = users.filter(user => user.id !== userId);
            broadcastUsers();
        }
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});
/**
 * The function `broadcastUsers` sends a JSON string containing information about users to all
 * connected WebSocket clients.
 */

function broadcastUsers() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'users', data: users }));
        }
    });
}

/**
 * The function `broadcastSignal` sends a JSON stringified signal to all WebSocket clients that are in
 * an open state.
 * @param signal - The `broadcastSignal` function takes a `signal` parameter, which is the data that
 * you want to broadcast to all connected WebSocket clients. This function iterates over all clients
 * connected to the WebSocket server (`wss`) and sends the `signal` data to each client that has an
 * open connection.
 */
function broadcastSignal(signal) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(signal));
        }
    });
}

/**
 * The function `handleAccelerometerData` sends accelerometer data to all connected WebSocket clients.
 * @param data - The `data` parameter in the `handleAccelerometerData` function likely represents the
 * accelerometer data that is being received or processed. This data could include information such as
 * acceleration values in different axes (x, y, z), timestamp, or any other relevant data from the
 * accelerometer sensor.
 */
function handleAccelerometerData(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'accelerometer', data }));
        }
    });
}

/* The code block you provided is setting up a server to listen on a specific port for incoming HTTP
requests. */
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
