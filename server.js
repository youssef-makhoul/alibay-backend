const EXPRESS_PORT_NUM = 4010;

let express = require('express');
let app = express();
let bodyParser = require('body-parser');

app.use(bodyParser.raw({
    type: '*/*'
}));

app.get('/ping', (req, res) => {
    res.send("Hello World");
});

app.listen(EXPRESS_PORT_NUM, () => {
    console.log("listen on port " + EXPRESS_PORT_NUM);
});