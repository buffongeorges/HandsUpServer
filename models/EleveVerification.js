const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EleveVerificationSchema = new Schema({
    eleveId: String, 
    uniqueString: String,
    createdAt: Date, 
    expiresAt: Date, 
});

const EleveVerification = mongoose.model('EleveVerification', EleveVerificationSchema);

module.exports = EleveVerification;