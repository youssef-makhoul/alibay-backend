var mongoose = require('mongoose');

let Schema = mongoose.Schema;

let UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    password: {
        type: String,
        required: true
    }
});

UserSchema.statics.exists = async function (username) {
    let users = await this.find({
        username: username
    }).exec();
    if (users.length > 0) return true;
    else return false;
};

UserSchema.methods.comparePassword = function (password) {
    return this.password === password;
};

module.exports = mongoose.model('user', UserSchema);