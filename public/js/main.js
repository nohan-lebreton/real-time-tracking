import { initUI, updateUserList } from './modules/ui.js';
import { socket } from './modules/socket.js';
import { initGeolocation } from './modules/geolocation.js';
import { displayLocalVideo, displayRemoteVideo } from './modules/video.js';
import { createPeerConnection, selectUser, handleSignal } from './modules/peerConnection.js';

document.addEventListener('DOMContentLoaded', function () {
    let map, userMarker, userId, isConnected = false;
    const markers = {};
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    let localStream;
    let peerConnection;

    initUI();

    initGeolocation(map, userMarker, userId, isConnected, localStream, socket);

    socket.onmessage = event => {
        if (!isConnected) return; // Check if still connected

        const message = JSON.parse(event.data);
        if (message.type === 'users') {
            const users = message.data;
            const connectedUsers = users.filter(user => !user.disconnect); // Filter connected users
            updateUserList(connectedUsers, markers);
        } else if (message.type === 'signal') {
            handleSignal(peerConnection, message, userId, socket);
        }
    };

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

    async function connect(username) {
        isConnected = true;
        document.getElementById('connectButton').innerText = 'Disconnect';

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true });
            displayLocalVideo(localVideo, localStream);
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
});
