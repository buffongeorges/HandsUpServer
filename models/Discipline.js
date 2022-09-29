const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DisciplineSchema = new Schema({
    id: String,
    name: String, 
});

const Discipline = mongoose.model('Discipline', DisciplineSchema);

module.exports = Discipline;