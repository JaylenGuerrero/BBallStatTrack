const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const accountSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    passwordHash: {type:String, required:true}
});

accountSchema.methods.setPassword = async function(password) {
    this.passwordHash = await bcrypt.hash(password, 10);
}

accountSchema.methods.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.passwordHash);
}

const Account = mongoose.model('Account', accountSchema);
module.exports = Account;