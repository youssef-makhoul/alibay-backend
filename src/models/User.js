var mongoose = require('mongoose');

let Schema = mongoose.Schema;

let UserSchema = new Schema({
    username: String,
    password: String
});

UserSchema.statics.exists = async function (username) {
    let users = await this.find({
        username: username
    }).exec();
    if (users.length > 0) return true;
    else return false;
};

module.exports = mongoose.model('user', UserSchema);