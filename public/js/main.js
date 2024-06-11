let map, userMarker, userId, isConnected = false;
const markers = {};
const socket = new WebSocket('wss://nohan.lebreton.caen.mds-project.fr');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;

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
                connect(username);
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
}

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
}

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

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

window.onload = initMap;
