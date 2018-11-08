//App Config
const config = require("config");
const dbConfig = config.get("dbConfig");
const appConfig = config.get("appConfig");
//Logger
const logger = require("../config/winston");
//Models
const ResponseMessage = require("./models/ResponseMessage");
const User = require("./models/User");
const Item = require("./models/Item");
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
        useNewUrlParser: true,
        useCreateIndex: true
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
            if (exists) sendFailResponse(res, "username " + username + " already exists !");
            else {
                let user = new User({
                    username: username,
                    password: crypto.hashPassword(password).hashedPassword
                });
                user.save(function (err) {
                    if (err) sendFailResponse(res, "error addind the user to the database: " + err.message);
                    else {
                        res.set("Set-Cookie", sessions.setNewSession(user.id));
                        sendSuccessResponse(res, "username " + username + " added");
                    }
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
        logger.info("login request from : " + ip);
        let username = JSON.parse(req.body).username;
        let password = JSON.parse(req.body).password;
        if (!username || !password) {
            sendFailResponse(res, "username or password cannot be empty");
            return;
        }
        User.exists(username).then(exists => {
            if (!exists) sendFailResponse(res, "username " + username + " does not exists !");
            else User.findOne({
                    username: username
                })
                .exec()
                .then((result, err) => {
                    if (err) sendFailResponse(res, "error checking the user in the database: " + err.message);
                    else {
                        let ok = result.comparePassword(crypto.hashPassword(password).hashedPassword);
                        if (ok) {
                            res.set("Set-Cookie", sessions.setNewSession(result.id));
                            sendSuccessResponse(res, "authenticated ok");
                        } else sendFailResponse(res, "wrong password for user: " + username);
                    }
                });
        });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.get('/logout', (req, res) => {
    let sessionid = req.headers.cookie;
    let userid = sessions.getUserID(sessionid);
    if (userid === undefined) {
        sendFailResponse(res, "not authorized ! - sessionid not recognized");
        return;
    }
    sessions.removeSession(sessionid);
    sendSuccessResponse(res, "logout successfull");
});

app.get('/getallitems', (req, res) => {
    let sessionid = req.headers.cookie;
    let userid = sessions.getUserID(sessionid);
    if (userid === undefined) {
        sendFailResponse(res, "not authorized ! - sessionid not recognized");
        return;
    }
    Item.find({})
        .exec()
        .then((result, err) => {
            if (err) sendFailResponse(res, "error getting items from the database: " + err.message);
            else {
                sendSuccessResponse(res, "OK", "items", result);
            }
        });
});

app.post('/additem', (req, res) => {
    let parsedItem = JSON.parse(req.body);
    let sessionid = req.headers.cookie;
    let userid = sessions.getUserID(sessionid);
    if (userid === undefined) {
        sendFailResponse(res, "not authorized ! - sessionid not recognized");
        return;
    }
    User.findOne({
            id: userid
        })
        .exec()
        .then((result, err) => {
            if (err) sendFailResponse(res, "error adding item to the database: " + err.message);
            else {
                parsedItem.userid = result.id;
                let item = new Item(parsedItem);
                item.save(function (err) {
                    if (err) sendFailResponse(res, "error item the user to the database: " + err.message);
                    else sendSuccessResponse(res, "item " + item.name + " added", "itemid", item.id);
                });
            }
        });
});

app.post('/deleteitem', (req, res) => {
    let parsedItem = JSON.parse(req.body);
    let sessionid = req.headers.cookie;
    let userid = sessions.getUserID(sessionid);
    if (userid === undefined) {
        sendFailResponse(res, "not authorized ! - sessionid not recognized");
        return;
    }
    Item.deleteOne({
        id: parsedItem.id,
        userid: userid
    }, (err, result) => {
        if (err) sendFailResponse(res, "error getting items from the database: " + err.message);
        if (result.n > 0) sendSuccessResponse(res, "item deleted successfully");
        else sendFailResponse(res, "no item found with id " + parsedItem.id);
    });
});

app.post('/updateitem', (req, res) => {
    let parsedItem = JSON.parse(req.body);
    let sessionid = req.headers.cookie;
    let userid = sessions.getUserID(sessionid);
    if (userid === undefined) {
        sendFailResponse(res, "not authorized ! - sessionid not recognized");
        return;
    }
    Item.updateOne({
            _id: parsedItem.id
        },
        parsedItem, (err, result) => {
            if (err) sendFailResponse(res, "error updating item from the database: " + err.message);
            else if (result.n > 0) sendSuccessResponse(res, "item updated successfully");
            else sendFailResponse(res, "no item found with id " + parsedItem.id);
        });
});