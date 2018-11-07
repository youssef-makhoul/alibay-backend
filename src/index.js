//App Config
const config = require("config");
const dbConfig = config.get("dbConfig");
const appConfig = config.get("appConfig");
//Logger
const logger = require("../config/winston");
//Models
const ResponseMessage = require("./models/ResponseMessage");
const User = require("./models/User");
//Express App
const app = require("express")();
//Mongoose
const mongoose = require("mongoose");
//SessionsPool
const SessionsPool = require("./models/SessionsPool");
//crypto
const crypto = require("./utils/saltedPassword");

let sessions = new SessionsPool();

mongoose.connect(
    dbConfig.connectionstring, {
        useNewUrlParser: true
    },
    () => {
        app.listen(appConfig.port, () => {
            logger.log("info", "listen on port " + appConfig.port);
        });
    }
);

// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on("error", console.error.bind(console, "MongoDB connection error:"));
//Body Parser
app.use(
    require("body-parser").raw({
        type: "*/*"
    })
);

let sendFailResponse = (res, msg, objName, obj) => {
    if (!objName) {
        let responseMsg = new ResponseMessage(false, msg);
        logger.info("fail response: " + msg);
        res.send(responseMsg.toString());
    } else {
        let responseMsg = new ResponseMessage(false, msg, {
            name: objName,
            value: obj
        });
        logger.info("fail response: " + msg);
        res.send(responseMsg.toString());
    }
};

let sendSuccessResponse = (res, msg, objName, obj) => {
    if (!objName) {
        let responseMsg = new ResponseMessage(true, msg);
        logger.info("success response: " + msg);
        res.send(responseMsg.toString());
    } else {
        let responseMsg = new ResponseMessage(true, msg, {
            name: objName,
            value: obj
        });
        logger.info("success response: " + msg);
        res.send(responseMsg.toString());
    }
};

app.post("/signup", (req, res) => {
    try {
        var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("signup request from : " + ip);

        let username = JSON.parse(req.body).username;
        let password = JSON.parse(req.body).password;
        if (!username || !password) {
            sendFailResponse(res, "username or password cannot be empty");
            return;
        }
        User.exists(username).then(exists => {
            if (exists)
                sendFailResponse(res, "username " + username + " already exists !");
            else {
                let user = new User({
                    username: username,
                    password: crypto.hashPassword(password).hashedPassword
                });
                user.save(function (err) {
                    if (err)
                        sendFailResponse(
                            res,
                            "error addind the user to the database: " + err.message
                        );
                    res.set("Set-Cookie", sessions.setNewSession(username));
                    sendSuccessResponse(res, "username " + username + " added");
                });
            }
        });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.post("/login", (req, res) => {
    try {
        var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("signup request from : " + ip);
        let username = JSON.parse(req.body).username;
        let password = JSON.parse(req.body).password;
        if (!username || !password) {
            sendFailResponse(res, "username or password cannot be empty");
            return;
        }
        User.exists(username).then(exists => {
            if (!exists) sendFailResponse(res, "username " + username + " does not exists !");
            else {
                User.findOne({
                        username: username
                    })
                    .exec()
                    .then((result, err) => {
                        if (err) sendFailResponse(res, "error checking the user in the database: " + err.message);
                        else {
                            let ok = result.comparePassword(crypto.hashPassword(password).hashedPassword);
                            if (ok) {
                                res.set("Set-Cookie", sessions.setNewSession(username));
                                sendSuccessResponse(res, "authenticated ok");
                            } else sendFailResponse(res, "wrong password for user: " + username);
                        }
                    });
            }
        });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});