var mongoose = require('mongoose');

var Facebookid = mongoose.model('Facebookid', {
    userid: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    }
});

module.exports = { Facebookid };