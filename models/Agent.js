const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const { Schema } = mongoose;

// define schema for tenants
// `password` will be taken care of by `passport-local-mongoose`
// createdAt and updatedAt will be taken care of by the timestamps schema option
// `optimisticConcurrency` opt will guard against race condition
const agentSchema = new Schema({
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
  reviews: [{
    // will be automatically converted to an array of subdocs
    user: {
      id: Schema.Types.ObjectId,
      firstName: String,
      lastName: String,
    },
    rating: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },
    comment: String,
  }],
  rating: {
    type: Number,
    default: 0,
  },
  listings: [{
    // to be populated with `house` objects in query
    // listings is an array of House instance IDs
    type: Schema.Types.ObjectId,
    ref: 'House',
  }],
}, { optimisticConcurrency: true, timestamps: true });

// plugin authentication middleware
// agentSchema.plugin(
// passportLocalMongoose, { usernameField: 'email', selectFields: ['email', 'listings'] });
agentSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

// TODO: connect mongoose before saving document
module.exports = mongoose.model('Agent', agentSchema);
