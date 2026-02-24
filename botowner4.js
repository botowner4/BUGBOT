const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const __path = process.cwd();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

let serverQR = require('./bugbotqr.js');
let codePair = require('./pair.js');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use('/bugbotqr', serverQR);
app.use('/pair', codePair);

app.get('/', async (req, res) => {
    res.sendFile(__path + '/botowner4page.html');
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

module.exports = app;
