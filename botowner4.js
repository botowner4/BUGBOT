const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const __path = process.cwd();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

// Routes
const serverQR = require('./bugbotqr');
const codePair = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

// Mount routers
app.use('/bugbotqr', serverQR);
app.use('/pair', codePair);

// Homepage
app.get('/', async (req, res) => {
    res.sendFile(__path + '/botowner4page.html');
});

// Start server
app.listen(PORT, () => {
    console.log("BUGFIXED XMD Server Running ✅");
    console.log("Port => " + PORT);
});

module.exports = app;
