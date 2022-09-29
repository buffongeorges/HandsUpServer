const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EvaluationSchema = new Schema({
    _id: String,
    name: String, 
    classes: Object,
    creationDate: Date,
    auteur: Object,
    nbQuestions: Number,
    questions: Object,
});

const Evaluation = mongoose.model('Evaluation', EvaluationSchema);

module.exports = Evaluation;