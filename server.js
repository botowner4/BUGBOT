const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const pairingSessions = new Map();

app.post('/api/request-pairing-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        const sessionId = 'SESSION_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const code = Math.random().toString().substring(2, 8);
        const formattedCode = code.substring(0, 3) + '-' + code.substring(3);

        pairingSessions.set(sessionId, { phoneNumber, code: formattedCode, expiresAt, status: 'pending', createdAt: new Date() });

        setTimeout(() => {
            pairingSessions.delete(sessionId);
        }, 10 * 60 * 1000);

        res.json({ sessionId, code: formattedCode, expiresAt: expiresAt.toISOString(), phoneNumber, status: 'code_generated' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate pairing code' });
    }
});

app.get('/api/session-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = pairingSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ sessionId, status: session.status, phoneNumber: session.phoneNumber, expiresAt: session.expiresAt, credentials: session.credentials || null });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date(), activeSessions: pairingSessions.size });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});

module.exports = { app, server };