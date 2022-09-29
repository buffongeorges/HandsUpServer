const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EleveSchema = new Schema({
    id: String,
    firstname: String,
    lastname: String, 
    email: String,
    password: Object, 
    dateOfBirth: Date,
    verified: Boolean,
    photo: String,
    placementClasse: Object, //place de l'eleve {anglais: 3, maths: 22, francais: 1}
    participation: Array, // {anglais: [4,6,0], maths: [5,2,3], francais: [2,2,2]}
    avertissement: Array,
    bonus: Array,
    lastUpdatedSeance: Number,
    position: Number,
    positions: Array,
    classe: String, //juste l'id
    college: String, //juste l'id
    empty: Boolean,
});

const Eleve = mongoose.model('Eleve', EleveSchema);

module.exports = Eleve;