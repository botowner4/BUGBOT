const express = require('express');
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const __path = process.cwd()
const PORT = process.env.PORT || 8000;
let server = require('./bugbotqr.js'),
    code = require('./pair');
require('events').EventEmitter.defaultMaxListeners = 500;
app.use('/bugbotqr', server);
app.use('/code', code);
app.use('/pair',async (req, res, next) => {
res.sendFile(__path + '/pair.html')
})
app.use('/',async (req, res, next) => {
res.sendFile(__path + '/botowner4page.html')
})
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(PORT, () => {
    console.log(`
Don't Forget To Give Star

 Server running on http://localhost:` + PORT)
})

module.exports = app
/**
    powered by BUGFIXED tech team 
    join Whatsapp channel for more updates 
    **/
