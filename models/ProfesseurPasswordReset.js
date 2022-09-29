const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfesseurPasswordResetSchema = new Schema({
    professeurId: String, 
    resetString: String,
    createdAt: Date, 
    expiresAt: Date, 
});

const ProfesseurPasswordReset = mongoose.model('ProfesseurPasswordReset', ProfesseurPasswordResetSchema);

module.exports = ProfesseurPasswordReset;