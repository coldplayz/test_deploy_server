require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const logger = require('morgan');
const cors = require('cors');
const path = require('path');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
// const path = require('path');
// const cookieParser = require('cookie-parser');
const session = require('express-session');
const allRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;
let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/latent';
if (process.env.ENVIRON === 'test') {
  MONGO_URI = 'mongodb://localhost/testdb';
}

// Initialize redis client.
// TODO: use client in utils/redis.js
let redisClient;
if (process.env.NODE_ENV === 'production') {
  // production environment
  redisClient = createClient({ url: process.env.REDIS_URI });
} else {
  redisClient = createClient();
}
redisClient.connect().catch(console.error);

// Initialize redis session store.
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'latent:',
});

// enable session support
const sessionConfig = {
  // TODO: use `real` secret as from the shell output of:
  // ...`node -e "console.log(crypto.randomBytes(32).toString('hex'))"`
  secret: 'non-keyboard mouse', // for testing
  cookie: { maxAge: 3600000 }, // cookie lasts an hour
  resave: false,
  saveUninitialized: false,
  store: redisStore,
};
app.use(session(sessionConfig));

// Serve static files from the public folder
app.use(express.static('public'));

// initialize app with passport
app.use(passport.initialize());
// authenticate session
app.use(passport.session());

// TODO: ensure it works for both Tenants and Agents also, or use a single collection for both
const Tenant = require('./models/Tenant');
const Agent = require('./models/Agent');

passport.use('tenantStrategy', Tenant.createStrategy());
passport.use('agentStrategy', Agent.createStrategy());
// serialization for agents and tenants
passport.serializeUser((user, done) => {
  // console.log('serialize', user); // SCAFF
  // user === full object
  if (user.listings instanceof Array) {
    return Agent.serializeUser()(user, done);
  }

  // Tenant
  return Tenant.serializeUser()(user, done);
});

// deserialization for agents and tenants
passport.deserializeUser(async (user, done) => {
  // console.log('deserialize', user); // SCAFF
  /*
  if (user.listings instanceof Array) {
    return Agent.deserializeUser()(user, done);
  }
  */

  /*
  // Tenant
  const x = Tenant.deserializeUser()(user, done);
  console.log(x); // SCAFF
  return x;
  */

  // serialize() saves only email, as at now; so user === email
  const docId = await Agent.exists({ email: user }); // or null

  if (docId) {
    return Agent.deserializeUser()(user, done);
  }

  // Tenant
  return Tenant.deserializeUser()(user, done);
});

// enable body-parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// setup logger
app.use(logger('dev'));

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
}));
// app.use(cookieParser());
// app.set('views', path.join(__dirname, 'views'));

// mount router
app.use('/api/v1', allRoutes);

// finally, at stack bottom, uncaught error handler
app.use(function (err, req, res, next) {
  console.log(err.stack);
  const message = `UNCAUGHT EXCEPTION: ${err.message}`;
  res.status(err.status || 500).json({ success: false, message });
});

// establish connections
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
  })
  .catch((err) => console.log(err.message));
