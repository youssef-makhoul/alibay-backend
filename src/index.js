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
let db = mongoose.connection;
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
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("signup request from : " + ip);
        logger.info(`request body:${req.body}`);
        let username = JSON.parse(req.body).username;
        let password = JSON.parse(req.body).password;
        if (!username || !password) {
            sendFailResponse(res, "username or password cannot be empty");
            return;
        }
        User.exists(username).then(exists => {
            if (exists) sendFailResponse(res, `username ${username} already exists !`);
            else {
                let user = new User({
                    username: username,
                    password: crypto.hashPassword(password).hashedPassword
                });
                user.save(function (err) {
                    if (err) sendFailResponse(res, "error addind the user to the database: " + err.message);
                    else {
                        res.set("Set-Cookie", sessions.setNewSession(user.id));
                        sendSuccessResponse(res, `username ${username} added`);
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
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("login request from : " + ip);
        logger.info(`request body:${req.body}`);
        let username = JSON.parse(req.body).username;
        let password = JSON.parse(req.body).password;
        if (!username || !password) {
            sendFailResponse(res, "username or password cannot be empty");
            return;
        }
        User.exists(username).then(exists => {
            if (!exists) sendFailResponse(res, `username ${username} does not exists !`);
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
                        } else sendFailResponse(res, `wrong password for user: ${username}`);
                    }
                });
        });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.get('/logout', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("logout request from : " + ip);

        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        sessions.removeSession(sessionid);
        sendSuccessResponse(res, "logout successfull");
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.get('/getallitems', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("getallitems request from : " + ip);

        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        Item.find({})
            .populate('user')
            .exec()
            .then((result, err) => {
                if (err) sendFailResponse(res, "error getting items from the database: " + err.message);
                else {
                    let arr = result.map(item => {
                        return item.getItem();
                    });
                    sendSuccessResponse(res, "got items successfully", "items", arr);
                }
            });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.post('/additem', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("additem request from : " + ip);
        logger.info(`request body:${req.body}`);
        let parsedItem = JSON.parse(req.body);
        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        if (parsedItem === undefined) {
            sendFailResponse(res, "no item found in request body");
            return;
        }
        User.findOne({
                _id: userid
            })
            .exec()
            .then((result, err) => {
                if (err) sendFailResponse(res, "error adding item to the database: " + err.message);
                else if (result === null) sendFailResponse(res, `could not find user with id ${userid} in the database`);
                else {
                    parsedItem.user = result.id;
                    let item = new Item(parsedItem);
                    item.save(function (err) {
                        if (err) sendFailResponse(res, "error item the user to the database: " + err.message);
                        else sendSuccessResponse(res, `item ${item.name} added successfully`, "id", item.id);
                    });
                }
            });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.post('/deleteitem', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("deleteitem request from : " + ip);
        logger.info(`request body:${req.body}`);
        let parsedItem = JSON.parse(req.body);
        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        if (parsedItem.id == undefined) {
            sendFailResponse(res, "field -id- not found in request body");
            return;
        }
        Item.deleteOne({
            id: parsedItem.id,
            user: userid
        }, (err, result) => {
            if (err) sendFailResponse(res, "error getting items from the database: " + err.message);
            else if (result.n > 0) sendSuccessResponse(res, "item deleted successfully");
            else sendFailResponse(res, `no item found with id ${parsedItem.id}`);
        });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.post('/updateitem', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("updateitem request from : " + ip);
        logger.info(`request body:${req.body}`);
        let parsedItem = JSON.parse(req.body);
        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        if (parsedItem === undefined) {
            sendFailResponse(res, "no item found in request body");
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
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.post('/getitembyid', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("updateitem request from : " + ip);
        logger.info(`request body:${req.body}`);
        let parsedItem = JSON.parse(req.body);
        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        if (parsedItem.id == null) {
            sendFailResponse(res, "item id was not found in request body");
            return;
        }
        Item.findById(parsedItem.id).populate('user').exec().then((result, err) => {
            if (err) sendFailResponse(res, "error getting item from the database: " + err.message);
            else if (result) sendSuccessResponse(res, "item found successfully", "item", result.getItem());
            else sendFailResponse(res, "no item found with id " + parsedItem.id);
        });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.post('/additemtocart', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("additemtocart request from : " + ip);
        logger.info(`request body:${req.body}`);
        let parsedItem = JSON.parse(req.body);
        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        if (parsedItem.id == null) {
            sendFailResponse(res, "item id was not found in request body");
            return;
        }
        Item.findOne({
                _id: parsedItem.id
            })
            .exec()
            .then((item, err) => {
                if (err) sendFailResponse(res, "error getting item from the database: " + err.message);
                else if (item == null) sendFailResponse(res, `no item found with id ${parsedItem.id}`);
                else {
                    User.findOne({
                            _id: userid
                        })
                        .exec()
                        .then((user, error) => {
                            if (error) sendFailResponse(res, `error getting user from the database: ${err.message}`);
                            else if (user == null) sendFailResponse(res, `no item found with id ${parsedItem.id}`);
                            else {
                                let found = false;
                                for (let i = 0; i < user.cart.length; i++)
                                    if (user.cart[i].item._id.equals(item._id)) {
                                        user.cart[i].quantity = user.cart[i].quantity + 1;
                                        found = true;
                                    }
                                if (!found) user.cart.push({
                                    item: item._id,
                                    quantity: 1
                                });
                                user.save(function (err) {
                                    if (err) sendFailResponse(res, "error addind the item to the cart: " + err.message);
                                    else sendSuccessResponse(res, "item added to cart successfully");
                                });
                            }
                        });
                }
            });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});


app.post('/removeitemfromcart', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("removeitemfromcart request from : " + ip);
        logger.info(`request body:${req.body}`);
        let parsedItem = JSON.parse(req.body);
        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        if (parsedItem.id == null) {
            sendFailResponse(res, "item id was not found");
            return;
        }
        Item.findOne({
                _id: parsedItem.id
            })
            .exec()
            .then((item, err) => {
                if (err) sendFailResponse(res, "error getting item from the database: " + err.message);
                else if (item == null) sendFailResponse(res, `no item found with id ${parsedItem.id}`);
                else {
                    User.findOne({
                            _id: userid
                        })
                        .exec()
                        .then((user, error) => {
                            if (error) sendFailResponse(res, `error getting user from the database: ${err.message}`);
                            else if (user == null) sendFailResponse(res, `no item found with id ${parsedItem.id}`);
                            else {
                                for (let i = 0; i < user.cart.length; i++) {
                                    if (user.cart[i].item._id.equals(item._id)) user.cart[i].quantity = user.cart[i].quantity - 1;
                                    if (user.cart[i].quantity === 0) user.cart.remove({
                                        _id: user.cart[i]._id
                                    });
                                }
                                user.save(function (err) {
                                    if (err) sendFailResponse(res, "error remove the item from the cart: " + err.message);
                                    else sendSuccessResponse(res, "item removed from cart successfully");
                                });
                            }
                        });
                }
            });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});

app.get('/getitemsincart', (req, res) => {
    try {
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        logger.info("getitemsincart request from : " + ip);

        let sessionid = req.headers.cookie;
        let userid = sessions.getUserID(sessionid);
        if (userid === undefined) {
            sendFailResponse(res, "not authorized ! - sessionid not recognized");
            return;
        }
        User.findOne({
                _id: userid
            })
            .populate('cart.item')
            .exec()
            .then((result, err) => {
                if (err) sendFailResponse(res, "error getting user cart from the database: " + err.message);
                else {
                    let arr = [];
                    for (let i = 0; i < result.cart.length; i++) {
                        arr.push({
                            item: result.cart[i].item.getItemSimplified(),
                            quantity: result.cart[i].quantity
                        });
                    }
                    sendSuccessResponse(res, "getting items in cart done successfully", "items", arr);
                }
            });
    } catch (error) {
        sendFailResponse(res, error.message);
    }
});