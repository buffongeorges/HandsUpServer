const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfesseurVerificationSchema = new Schema({
    professeurId: String, 
    uniqueString: String,
    createdAt: Date, 
    expiresAt: Date, 
});

const ProfesseurVerification = mongoose.model('ProfesseurVerification', ProfesseurVerificationSchema);

module.exports = ProfesseurVerification;