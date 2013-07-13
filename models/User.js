var mongoose = require('mongoose')
  , crypto = require('crypto');

var validatePresenceOf = function (value) {
    return value && value.length
};

var User = new mongoose.Schema({
    name: String,
    email: {type: String, index: {unique: true}},
    hashed_password: String,
    salt: String,
    authToken: String,
    facebook: {},
    twitter: {},
    google: {}
});

User.virtual('password')
    .set(function (password) {
        this._password = password;
        this.salt = this.makeSalt();
        this.hashed_password = this.encryptPassword(password);
    })
    .get(function () { return this._password; });

User.virtual('id')
    .get(function () {
        return this._id.toHexString();
    });

User.methods = {
    authenticate: function (plainText) {
        return this.encryptPassword(plainText) === this.hashed_password;
    },
    makeSalt: function () {
        return Math.round((new Date().valueOf() * Math.random())) + '';
    },
    encryptPassword: function (password) {
        if (!password) return '';
        var encrypted;
        try {
            encrypted = crypto.createHmac('sha1', this.salt).update(password).digest('hex');
            return encrypted;
        } catch (err) {
            console.log('encrypt password error : ' + err);
            return '';
        }
    }
};

User.pre('save', function (next) {
    if (!validatePresenceOf(this.password)) {
        next(new Error('Invalid password'));
    }
    else {
        next();
    }
});

mongoose.model('User', User);