const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const __path = process.cwd();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

const server = require('./bugbotqr');
const code = require('./pair');
require('events').EventEmitter.defaultMaxListeners = 500;

app.use('/bugbotqr', server);
app.use('/pair', code);

app.get('/', async (req, res) => {
    res.sendFile(__path + '/botowner4page.html');
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

module.exports = app;
