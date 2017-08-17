var mongoose = require('mongoose');
var Subjects = mongoose.model('Subjects', {
    title: {
        type: String,
        required: true, // it should be entered
        minlength: 1, // it should at least one letter
        trim: true // trim spaces in beggining of the word
    },
    field: {
        type: String,
        required: true,
        minlength: 1,
        trim: true  
    },
    ytLink: {
        type: String,
        required: true,
        minlength: 1,
        trim: true 
    },
    document: {
        type: String,
        required: true,
        minlength: 1,
        trim: true 
    },
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
});

module.exports = {Subjects};