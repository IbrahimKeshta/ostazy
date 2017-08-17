var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://ibrahimkeshta:Ebrahim2525@ds149353.mlab.com:49353/ostazy_api");

module.exports = {mongoose};