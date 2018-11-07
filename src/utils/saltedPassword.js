let crypto = require('crypto');
let sha256 = require('sha256')

function genRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') /** convert to hexadecimal format */
        .slice(0, length); /** return required number of characters */
};

module.exports.saltHashPassword = function saltHashPassword(userpassword) {
    var salt = genRandomString(16); /** Gives us salt of length 16 */
    var passwordData = sha256(userpassword + salt);
    return {
        salt: salt,
        hashedPassword: passwordData
    };
}

module.exports.hashPassword = function saltHashPassword(userpassword) {
    var passwordData = sha256(userpassword);
    return {
        hashedPassword: passwordData
    };
}