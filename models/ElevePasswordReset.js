const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ElevePasswordResetSchema = new Schema({
    eleveId: String, 
    resetString: String,
    createdAt: Date, 
    expiresAt: Date, 
});

const ElevePasswordReset = mongoose.model('ElevePasswordReset', ElevePasswordResetSchema);

module.exports = ElevePasswordReset;