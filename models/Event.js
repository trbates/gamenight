var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var InvitationSchema = new Schema({
        event: { type: Schema.ObjectId, ref: 'Event' },
        name: String,
        email: String,
        createdAt: { type: Date, default: Date.now }
    });

InvitationSchema.index({ event: 1, email: 1 }, { unique: true });

var EventSchema = new Schema({
    title: String,
    when: Date,
    where: String,
    description: String,
    user: { type: Schema.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});


EventSchema.statics = {
    load: function(id, callback) {
        this.findOne({ _id : id })
            .populate('user')
            .exec(callback);
    }
};

mongoose.model('Event', EventSchema);
mongoose.model('Invitation', InvitationSchema);