const mongoose = require('mongoose');
// const axios = require('axios');

const LocationSchema = new mongoose.Schema({
  country: {
    type: String,
    required: [true, 'country missing'],
  },
  state: {
    type: String,
    required: [true, 'state missing'],
  },
  city: {
    type: String,
    required: [true, 'city missing'],
  },
});

const HouseSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  description: {
    type: String,
    required: [true, 'description missing'],
  },
  location: {
    type: LocationSchema,
    required: true,
  },
  latitude: {
    type: Number,
    default: null,
  },
  longitude: {
    type: Number,
    default: null,
  },
  price: {
    type: Number,
    required: [true, 'price missing'],
  },
  coverImage: {
    type: String,
    required: [true, 'cover image missing'],
  },
  images: [String],
  numRooms: {
    type: Number,
    required: [true, 'number of rooms missing'],
  },
  numBathrooms: {
    type: Number,
    required: [true, 'number of bathrooms missing'],
  },
  numToilets: {
    type: Number,
    required: [true, 'number of toilets missing'],
  },
  numFloors: {
    type: Number,
    required: [true, 'number of floors country missing'],
  },
  shared: {
    type: Boolean,
    required: true,
  },
  water: {
    type: Boolean,
    required: true,
  },
  electricity: {
    type: Boolean,
    required: true,
  },
  name: {
    type: String,
    required: [true, 'name missing'],
  },
  address: {
    type: String,
    required: [true, 'address missing'],
  },
  houseType: {
    type: String,
    required: [true, 'house type missing'],
  },
});

// eslint-disable-next-line func-names
HouseSchema.pre('save', async function (next) {
  console.log(this);
  try {
    // eslint-disable-next-line no-undef
    const response = await fetch(
      `https://geocode.xyz/${this.location.city}?json=1`,
    );
    const { longt, latt } = await response.json();
    if (longt && latt) {
      this.latitude = latt;
      this.longitude = longt;
    } else {
      this.latitude = null;
      this.longitude = null;
    }
  } catch (error) {
    console.log(error.message);
    this.latitude = null;
    this.longitude = null;
  }
  next();
});

const House = mongoose.model('House', HouseSchema);
module.exports = House;
