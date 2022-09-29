const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EcoleSchema = new Schema({
    _id: String,
    name: String, 
    classes: Object,
    endOfTrimestre: Date,
});

const Ecole = mongoose.model('Ecole', EcoleSchema);

module.exports = Ecole;