let config = require('config');
let dbConfig = config.get('dbConfig');
let appConfig = config.get('appConfig');

let app = require('express')();

let MongoClient = require("mongodb").MongoClient;
let db;

let logger = require('./config/winston')


app.use(
    require('body-parser').raw({
        type: "*/*"
    })
);

// Initialize connection once
MongoClient.connect(
    dbConfig.connectionstring, {
        useNewUrlParser: true
    },
    function (err, database) {
        if (err) throw err;
        db = database;
        app.listen(appConfig.port, () => {
            logger.log('info', "listen on port " + appConfig.port);
        });
    }
);

//starting of endpoints

app.get("/ping", (req, res) => {
    res.send("Hello World");
});