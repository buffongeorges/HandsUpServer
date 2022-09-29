const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClasseSchema = new Schema({
    id: String,
    name: String, 
    ecole: Object,
    eleves: Array, 
    professeurs: Array,
});

const Classe = mongoose.model('Classe', ClasseSchema);

module.exports = Classe;