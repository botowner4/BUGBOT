// File: public/js/client.js

// Function to handle pairing code request
async function requestPairingCode() {
    const response = await fetch('/api/request-pairing-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (response.ok) {
        const data = await response.json();
        console.log('Pairing code sent:', data);
        alert('Pairing code has been sent to your email.');
    } else {
        console.error('Error requesting pairing code:', response.statusText);
        alert('Failed to request pairing code. Please try again.');
    }
}

// Function to handle user session management
function manageSession() {
    const sessionData = JSON.parse(localStorage.getItem('sessionData')) || {};
    if (sessionData.userId) {
        console.log('User is logged in:', sessionData.userId);
        // Add session handling logic (e.g., keep user logged in)
    } else {
        console.log('No user session found.');
        // Add logic for redirecting to login page or handling session timeout
    }
}

// Example on how to call the functions
document.getElementById('pairingButton').addEventListener('click', requestPairingCode);
manageSession();
