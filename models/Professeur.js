const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfesseurSchema = new Schema({
    id: String,
    firstname: String,
    lastname: String, 
    email: String,
    password: String, 
    dateOfBirth: Date,
    verified: Boolean,
    admin: Boolean,
    college: Array,
    classes: Object,
    photo: String,
    noteDepart: Number,
    participation: Number,
    avertissement: Number,
    bonus: Number,
    discipline: Object,
});

const Professeur = mongoose.model('Professeur', ProfesseurSchema);

module.exports = Professeur;