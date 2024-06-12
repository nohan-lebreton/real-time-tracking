/**
 * The above JavaScript code establishes a WebSocket connection, enables video streaming and
 * geolocation tracking, facilitates peer-to-peer communication, and integrates accelerometer data
 * sharing for a real-time user interaction application.
 */
/* The code snippet you provided is declaring several variables and constants used in the JavaScript
application. Here is a breakdown of what each variable is doing: */
let map, userMarker, userId, isConnected = false;
const markers = {};
const socket = new WebSocket('wss://nohan.lebreton.caen.mds-project.fr');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const accelX = document.getElementById('accelX');
const accelY = document.getElementById('accelY');
const accelZ = document.getElementById('accelZ');
let localStream;
let peerConnection;
/**
 * The `initMap` function sets up a Leaflet map, handles user interaction for connecting to a service,
 * and manages motion permission for accelerometer access.
 */

function initMap() {
    map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    document.getElementById('connectButton').addEventListener('click', () => {
        const username = document.getElementById('username').value.trim();
        if (username !== '') {
            if (!isConnected) {
                userId = generateId();
                requestMotionPermission().then(granted => {
                    if (granted) {
                        connect(username);
                    } else {
                        alert('Motion access permission denied.');
                    }
                });
            } else {
                disconnect();
            }
        } else {
            alert('Please enter a username.');
        }
    });

    document.getElementById('username').addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            document.getElementById('connectButton').click();
        }
    });

    // Event listener for motion permission button
    document.getElementById('motionPermissionButton').addEventListener('click', async () => {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            const permissionState = await requestMotionPermission();
            if (permissionState === 'granted') {
                startAccelerometer();
            }
        } else {
            startAccelerometer(); // For browsers that don't require permission
        }
    });
}
/**
 * The `connect` function establishes a connection, accesses media devices, tracks geolocation, and
 * sends user data over a socket.
 * @param username - The `username` parameter in the `connect` function represents the username of the
 * user who is connecting to the application or service. It is used to personalize the user's
 * experience, such as displaying their username in the UI or in pop-up messages on the map.
 * @returns The `connect` function returns nothing explicitly, as there is no `return` statement at the
 * end of the function. If the function completes without encountering any errors, it will implicitly.
 */

async function connect(username) {
    isConnected = true;
    document.getElementById('connectButton').innerText = 'Disconnect';

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Error accessing media devices.', error);
        alert('Error accessing media devices.');
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            if (!isConnected) return; // Check if still connected
            const { latitude, longitude } = position.coords;
            const pos = [latitude, longitude];

            if (!userMarker) {
                userMarker = L.marker(pos).addTo(map).bindPopup(`Your Position (${username})`).openPopup();
            } else {
                userMarker.setLatLng(pos);
            }

            map.setView(pos);
            socket.send(JSON.stringify({ type: 'user', id: userId, username, position: { latitude, longitude } }));
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }

    // Start Accelerometer
    startAccelerometer();
}

/**
 * The `disconnect` function in JavaScript is used to disconnect a user from a connection, remove
 * markers from a map, clear user list, and close peer connections.
 */
function disconnect() {
    isConnected = false;
    document.getElementById('connectButton').innerText = 'Connect';
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    socket.send(JSON.stringify({ type: 'user', id: userId, disconnect: true }));
    // Remove user markers from the map
    Object.keys(markers).forEach(id => {
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });
    // Clear the user list
    document.getElementById('users').innerHTML = '';
    localVideo.srcObject = null;
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
}
/* The above code is handling incoming messages from a socket connection. It first checks if the
connection is still active. If the message type is 'users', it processes the user data received,
filters out disconnected users, updates map markers for connected users, removes markers of
disconnected users, and updates the user list displayed on the webpage with connected users'
information. If the message type is 'signal', it calls the handleSignal function to process the
signal message. */

socket.onmessage = event => {
    if (!isConnected) return; // Check if still connected

    const message = JSON.parse(event.data);
    if (message.type === 'users') {
        const users = message.data;
        const connectedUsers = users.filter(user => !user.disconnect); // Filter connected users

        // Update the map markers
        connectedUsers.forEach(user => {
            if (!markers[user.id]) {
                markers[user.id] = L.marker([user.position.latitude, user.position.longitude]).addTo(map).bindPopup(`${user.username}'s Position`);
            } else {
                markers[user.id].setLatLng([user.position.latitude, user.position.longitude]);
            }
        });

        // Remove markers of disconnected users
        Object.keys(markers).forEach(id => {
            if (!connectedUsers.find(user => user.id === id)) {
                map.removeLayer(markers[id]);
                delete markers[id];
            }
        });

        // Update the user list
        const userList = document.getElementById('users');
        userList.innerHTML = '';
        connectedUsers.forEach(user => {
            const listItem = document.createElement('li');
            listItem.textContent = `${user.username} connected at ${user.connectedAt}`;
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Camera';
            viewButton.addEventListener('click', () => {
                selectUser(user.id);
            });
            listItem.appendChild(viewButton);
            userList.appendChild(listItem);
        });
    } else if (message.type === 'signal') {
        handleSignal(message);
    }
};
/**
 * The `selectUser` function selects a user, creates a peer connection, adds local stream tracks to the
 * connection, creates an offer, sets the local description, and sends the offer to the selected user
 * via a socket.
 * @param id - The `id` parameter in the `selectUser` function represents the unique identifier of the
 * user that you want to select for communication. This identifier is used to establish a connection
 * with the specified user and send signaling information such as the offer generated by the peer
 * connection.
 */

async function selectUser(id) {
    console.log(`Selecting user ${id}`);
    if (peerConnection) {
        peerConnection.close();
    }

    peerConnection = createPeerConnection(id);

    // Add local stream tracks to peer connection
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Create offer and send to selected user
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: 'signal',
        id: userId,
        target: id,
        offer: peerConnection.localDescription
    }));
}
/**
 * The function `handleSignal` processes signaling messages for WebRTC communication, handling offers,
 * answers, and ICE candidates based on the target user ID.
 * @param message - The `handleSignal` function takes in a `message` object as a parameter. The
 * `message` object contains the following properties:
 */

function handleSignal(message) {
    const { id, target, offer, answer, candidate } = message;

    if (target === userId) {
        if (offer) {
            console.log(`Received offer from ${id}`);
            peerConnection = createPeerConnection(id);

            peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
                .then(() => peerConnection.createAnswer())
                .then(answer => peerConnection.setLocalDescription(answer))
                .then(() => {
                    socket.send(JSON.stringify({
                        type: 'signal',
                        id: userId,
                        target: id,
                        answer: peerConnection.localDescription
                    }));
                });
        } else if (answer) {
            console.log(`Received answer from ${id}`);
            peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } else if (candidate) {
            console.log(`Received candidate from ${id}`);
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }
}
/**
 * The function `createPeerConnection` sets up a WebRTC peer connection with a specified ID, handling
 * ICE candidates and remote stream tracking.
 * @param id - The `id` parameter in the `createPeerConnection` function represents the unique
 * identifier of the peer with whom you are establishing a connection. This identifier is used to
 * differentiate between different peers in a peer-to-peer communication setup.
 * @returns The `createPeerConnection` function returns an RTCPeerConnection object that is set up with
 * the specified configuration and event handlers for handling ICE candidates and incoming media
 * streams.
 */

function createPeerConnection(id) {
    console.log(`Creating peer connection with ${id}`);
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    };
    const peerConnection = new RTCPeerConnection(config);

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: 'signal',
                id: userId,
                target: id,
                candidate: event.candidate
            }));
            console.log(`Sending candidate to ${id}`);
        }
    };

    peerConnection.ontrack = event => {
        console.log('Received remote stream');
        remoteVideo.srcObject = event.streams[0];
    };

    return peerConnection;
}

/**
 * The function `generateId` generates a unique ID by appending an underscore to a random string.
 * @returns The `generateId` function returns a string that starts with an underscore character
 * followed by a random alphanumeric string of length 9.
 */
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

window.onload = initMap;
/**
 * The function `startAccelerometer` checks for accelerometer support and streams accelerometer data to
 * a server if available.
 */

// Function to start the accelerometer
function startAccelerometer() {
    if ('Accelerometer' in window) {
        const accelerometer = new Accelerometer({ frequency: 60 });
        accelerometer.addEventListener('reading', () => {
            accelX.textContent = accelerometer.x.toFixed(2);
            accelY.textContent = accelerometer.y.toFixed(2);
            accelZ.textContent = accelerometer.z.toFixed(2);

            if (isConnected) {
                socket.send(JSON.stringify({
                    type: 'accelerometer',
                    id: userId,
                    data: {
                        x: accelerometer.x,
                        y: accelerometer.y,
                        z: accelerometer.z
                    }
                }));
            }
        });
        accelerometer.start();
    } else {
        console.error('Accelerometer not supported');
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (event) => {
                accelX.textContent = event.acceleration.x.toFixed(2);
                accelY.textContent = event.acceleration.y.toFixed(2);
                accelZ.textContent = event.acceleration.z.toFixed(2);

                if (isConnected) {
                    socket.send(JSON.stringify({
                        type: 'accelerometer',
                        id: userId,
                        data: {
                            x: event.acceleration.x,
                            y: event.acceleration.y,
                            z: event.acceleration.z
                        }
                    }));
                }
            });
        } else {
            console.error('DeviceMotionEvent not supported');
        }
    }
}
/**
 * The function `requestMotionPermission` checks for permission to access device motion data and starts
 * the accelerometer if permission is not required.
 * @returns The function `requestMotionPermission` returns a boolean value. It returns `true` if motion
 * permission is granted or if the browser does not require permission for motion events. It returns
 * `false` if permission is not granted or if an error occurs during the permission request process.
 */

// Function to request motion permission
async function requestMotionPermission() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceMotionEvent.requestPermission();
            if (permissionState === 'granted') {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    } else {
        startAccelerometer(); // For browsers that don't require permission
        return true;
    }
}
