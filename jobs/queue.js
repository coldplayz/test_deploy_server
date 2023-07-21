const Queue = require('bull');

let bookHouseQueue;
let resetPassword;

if (process.env.NODE_ENV !== 'production') {
  bookHouseQueue = new Queue('sendNotificationForHouseBooking', {
    redis: {
      host: 'localhost',
      port: 6379,
    },
  });

  resetPassword = new Queue('resetPassword', {
    redis: {
      host: 'localhost',
      port: 6379,
    },
  });
} else {
  // production environment
  bookHouseQueue = new Queue('sendNotificationForHouseBooking', process.env.REDIS_URI);

  resetPassword = new Queue('resetPassword', process.env.REDIS_URI);
}

module.exports = { bookHouseQueue, resetPassword };
