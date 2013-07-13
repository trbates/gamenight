var mongoose = require('mongoose');

var LoginTokenSchema = new mongoose.Schema({
    email: { type: String, index: true },
    series: { type: String, index: true },
    token: { type: String, index: true }
});

LoginTokenSchema.method('randomToken', function () { 
    return Math.round((new Date().valueOf() * Math.random())) + '';
});

LoginTokenSchema.pre('save', function(next) {
    // Automatically create the tokens
    this.token = this.randomToken();

    if (this.isNew)
        this.series = this.randomToken();

    next();
});

LoginTokenSchema.virtual('id')
    .get(function() {
        return this._id.toHexString();
});

LoginTokenSchema.virtual('cookieValue')
    .get(function() {
      return JSON.stringify({ email: this.email, token: this.token, series: this.series });
});

mongoose.model('LoginToken', LoginTokenSchema);