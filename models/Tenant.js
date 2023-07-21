const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const { Schema } = mongoose;

// define schema for tenants
// `password` will be taken care of by `passport-local-mongoose`
// createdAt and updatedAt will be taken care of by the timestamps schema option
// `optimisticConcurrency` opt will guard against race condition
const tenantSchema = new Schema({
  firstName: {
    type: String,
    required: [true, 'first name missing'],
  },
  lastName: {
    type: String,
    required: [true, 'last name missing'],
  },
  email: {
    type: String,
    required: [true, 'email missing'],
    unique: true,
  },
  phone: String,
  cart: [{
    // to be populated with `house` objects in query
    // cart is an array of House instance IDs
    type: Schema.Types.ObjectId,
    ref: 'House',
  }],
}, { optimisticConcurrency: true, timestamps: true });

// plugin authentication middleware
tenantSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

// TODO: connect mongoose before saving document
module.exports = mongoose.model('Tenant', tenantSchema);
