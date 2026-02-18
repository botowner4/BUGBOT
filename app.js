const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const pairingRoutes = require('./routes/pairing');
app.use('/api/pairing', pairingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Bot is running', timestamp: new Date() });
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Express Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📱 Access pairing at http://localhost:${PORT}`);
});

module.exports = { app, server };
