let config = require('config');
let dbConfig = config.get('dbConfig');
let appConfig = config.get('appConfig');

let app = require('express')();

let MongoClient = require("mongodb").MongoClient;
let db;
let usersCol;

let logger = require('./config/winston')

let ResponseMessage = require('./models/ResponseMessage');

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
        db = database.db('alibay-marketplace');
        usersCol = db.collection('users');
        app.listen(appConfig.port, () => {
            logger.log('info', "listen on port " + appConfig.port);
        });
    }
);

//starting of endpoints

app.post("/signup", (req, res) => {
    try {
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        logger.log('info', 'signup request from : ' + ip)
        let responseMsg = new ResponseMessage(true, '');
        let parsedBody = JSON.parse(req.body);
        if (!parsedBody.username || !parsedBody.password) {
            responseMsg.success = false;
            responseMsg.message = "username or password cannot be empty";
            logger.log('info', responseMsg.message);
            res.send(responseMsg.toString());
            return;
        }

        usersCol.findOne({
            username: parsedBody.username
        }, (err, user) => {
            if (err) logger.log('error', err);
            if (user) {
                responseMsg.success = false;
                responseMsg.message = "username " + parsedBody.username + " already exists";
                logger.log('info', responseMsg.message);
                res.send(responseMsg.toString());
            } else {
                usersCol.insertOne({
                    username: parsedBody.username,
                    password: parsedBody.password
                }, (err, result) => {
                    if (err) logger.log('error', err);
                    else {
                        responseMsg.success = true;
                        responseMsg.message = "username " + parsedBody.username + " added";
                        logger.log('info', responseMsg.message);
                        res.send(responseMsg.toString());
                    }
                })
            }
        });
    } catch (error) {
        logger.error(error);
        res.send(new ResponseMessage(false, error.message).toString());
        return;
    }
});