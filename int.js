const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost/testdb';

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('connected!');
  })
  .catch((err) => console.log(err.message));

const schema = new mongoose.Schema({
  name: String,
  reviews: [{
    comment: String,
    rating: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },
  }],
});

module.exports.model = mongoose.model('test', schema);
exports.mongoose = mongoose;
