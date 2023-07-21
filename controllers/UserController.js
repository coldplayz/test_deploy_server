const passport = require('passport');
const mongoose = require('mongoose');
// const Bull = require('bull');
const speakEasy = require('speakeasy');
const { resetPassword: pwdQueue } = require('../jobs/queue');
const redisClient = require('../utils/redis');
const Tenant = require('../models/Tenant');
const Agent = require('../models/Agent');
const House = require('../models/House');
const Rating = require('../models/Rating');

// a Bull queue using default 127.0.0.1:6379 connection
// const pwdQueue = new Bull('resetPassword');

// generate a secret key of length 20 for OTPs
const secret = speakEasy.generateSecret({ length: 20 });

/**
 * Capitalizes a string to title case.
 * @param {String} str - The string to capitalize.
 * @returns {String} - The capitalized string, if not empty and/or is a string; otherwise str.
 *
 * Examples:
 * - capitalize('naMe') --> 'Name'
 * - capitalize(50) --> 50
 */
function capitalize(str) {
  if ((str instanceof String || typeof str === 'string') && str.length > 0) {
    const firstChar = str.charAt(0);
    const otherChar = str.slice(1);
    const capitalizedStr = `${firstChar.toUpperCase()}${otherChar.toLowerCase()}`;
    return capitalizedStr;
  }
  // invalid argument; return as-is
  return str;
}

class UserController {
  // TODO: wrap method code in try/catch to handled currently uncaugth errors
  // TODO: implement email blacklist; can be stored in redis.
  /**
   * Create a new user entry with the provided details.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to the
   * ...creation and log-in of a new user, or failure.
   *
   * Algorithm:
   *
   * - req.body should contain firstName, lastName, email, password, and
   *   isAgent as required properties, and phone as an optional property.
   *   TEST:
   *     - response/behaviour on:
   *       - no firstName
   *       - no lastName
   *       - no email
   *       - no password
   *       - no isAgent
   *       - no phone
   *       - all data
   * - user is registered as a Tenant or Agent, depending on the isAgent flag.
   *   If the email is already registered in the collection, an error is sent, else
   *   registration is successfull and the user is logged in.
   *   TEST:
   *     - response/behaviour on:
   *       - already-registered email
   *     - that user is logged-in after successfull registration
   *     - that user document is actually created in DB
   */
  static async postUser(req, res) {
    // TODO: check blacklisted emails
    // console.log('login controller called'); // SCAFF
    if (!req.isAuthenticated()) {
      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        isAgent,
      } = req.body; // TODO: app.use(express.json())

      // ensure password is present
      if (!password) {
        return res.status(400).json({ success: false, message: 'password missing' });
      }

      // register
      if (isAgent && isAgent.toLowerCase() === 'true') {
        // create an Agent doc
        Agent.register(new Agent({
          // array attr, like reviews, will be init to []
          firstName: capitalize(firstName),
          lastName: capitalize(lastName),
          email,
          phone,
        }), password, (err, agent) => {
          // console.log(agent); // SCAFF
          if (err && !agent) {
            res.status(400).json({ success: false, message: err.toString() });
          } else if (agent) {
            // agent created; log in the user
            // NOTE1: one way of authenticating; call login()
            req.login(agent, (err) => {
              if (err) {
                return res.status(401).json({ success: false, message: err.toString() });
              }
              // successfull log in
              return res.status(201).json({ success: true, message: 'created and logged-in successfully' });
            });
          }
        });
        // res.end();
      } else if (isAgent && isAgent.toLowerCase() === 'false') {
        // create a Tenant doc
        Tenant.register(new Tenant({
          firstName: capitalize(firstName),
          lastName: capitalize(lastName),
          email,
          phone,
        }), password, (err, tenant) => {
          // console.log(tenant); // SCAFF
          if (err && !tenant) {
            res.status(400).json({ success: false, message: err.toString() });
          } else if (tenant) {
            // tenant created; log the tenant in
            req.login(tenant, (err) => {
              if (err) {
                return res.status(401).json({ success: false, message: err.toString() });
              }
              // successfull log in
              return res.status(201).json({ success: true, message: 'created and logged-in successfully' });
            });
          }
        });
        // res.end();
      } else if (!isAgent) {
        // isAgent not set
        return res.status(400).json({ success: false, message: 'isAgent missing' });
      }
      return undefined;
    }

    // user logged in; needs to logout first
    return res.status(401).json({ success: false, message: 'user must be logged out' });
  }

  /**
   * Authenticate a user with the provided details.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to the authentication of a user, or failure.
   *
   * Algorithm:
   *
   * - req.body should contain email and password as required properties.
   *   TEST:
   *     - response/behaviour on:
   *       - no email
   *       - no password
   * - passport takes care of authentication.
   *   If authentication fails (likely due to no/invalid email and/or password),
   *   error is sent, else the user is logged in.
   *   TEST:
   *     - response/behaviour on:
   *       - wrong email
   *       - wrong password
   *     - that the user is logged in on successfull auth
   * - if user is already logged in, error is sent
   *   TEST:
   *     - response/behaviour on:
   *       - user already logged in
   */
  static async postLogin(req, res, next) {
    // authenticate with the registered local strategy
    // NOTE1: another way of authenticating; call authenticate() which
    // ...returns a middleware to which you have to pass req and res objects.
    // If (err, user, info) callback,
    // ...or options, not set, authenticate will automatically respond with 401.
    // Passport tries each specified strategy, until one successfully authenticates, or all fail.
    // TODO: response if user already authenticated
    if (!req.isAuthenticated()) {
      passport.authenticate(['tenantStrategy', 'agentStrategy'], (err, user/* , info */) => {
        if (err) {
          // some server error
          res.status(500).json({ success: false, message: err.toString() });
        } else if (!user) {
          // authentication failed
          res.status(401).json({ success: false, message: 'authentication failed' });
        } else {
          // auth successfull
          req.login(user, (err) => {
            if (err) {
              return res.status(401).json({ success: false, message: err.toString() });
            }
            // successfull log in
            return res.status(200).json({ success: true, message: 'authenticated' });
          });
        }
      })(req, res, next);
      return undefined;
    }

    // user already authenticated
    return res.status(401).json({ success: false, message: 'already authenticated' });
  }

  /**
   * Logs out an authenticated user.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to the log-out of a user, or failure.
   *
   * Algorithm:
   *
   * - an authenticated user is logged out using req.logout provided by passport.
   *   TEST:
   *     - response/behaviour on:
   *       - successfull logout
   * - if the user is not logged in to begin with, error is sent
   *   TEST:
   *     - response/behaviour on:
   *       - user not logged in already
   */
  static async postLogout(req, res) {
    if (req.isAuthenticated()) {
      req.logout((err) => {
        if (err) {
          // probably some server error
          res.status(500).json({ success: false, message: err.toString() });
        }
        // logout successfull
        res.status(200).json({ success: true, message: 'logout successfull' });
      });
      return undefined;
    }

    return res.status(401).json({ success: false, message: 'user not logged in' });
  }

  /**
   * Returns a specific Agent by ID.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to a response with a contactless Agent object.
   *
   * Algorithm:
   *
   * - req.params should contain a required agentId property.
   *   TEST:
   *     - response/behaviour on:
   *       - no agentId
   * - if the user is logged in, the agentId is used to fetch and send agent info without
   *   salt, hash, email, and phone properties.
   *   TEST:
   *     - response/behaviour on:
   *       - invalid agentId
   *     - that the returned object doesn't have salt, hash, email, and phone properties defined
   * - if the user is logged out, send error.
   *   TEST:
   *     - response/behaviour on:
   *       - user not logged in
   */
  static async getAgent(req, res) {
    // retrieve agentId string from URI
    let { agentId } = req.params;

    // IF agentId is set, use it to fetch agent doc
    if (agentId && req.isAuthenticated()) {
      try {
        agentId = new mongoose.Types.ObjectId(agentId);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'invalid agent ID' });
      }
      const agentDoc = await Agent.findById(agentId).exec();

      // convert to plain JavaScript object
      const agentObj = agentDoc.toObject();

      // delete salt, hash, email, and phone properties
      delete agentObj.salt;
      delete agentObj.hash;
      delete agentObj.email;
      delete agentObj.phone;

      // send it
      return res.json(agentObj);
    }

    if (!agentId && req.isAuthenticated()) {
      // no agentId set
      return res.status(400).json({ success: false, message: 'no agent ID set' });
    }

    // user not logged in
    return res.status(401).json({ success: false, message: 'user not logged in' });
  }

  /**
   * Changes/resets a user's password.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to a password change, or failure
   *
   * Algorithm:
   *
   * oldPassword and newPassword are always expected in the request body (form).
   * If both are set, attempt is made to change the password, as for Case1.
   * If password is changed correctly, user is logged out.
   * If oldPassword is incorrect, error is sent.
   * If any of them is missing, check for email is done.
   * TEST:
   *  - response/behaviour on:
   *    - user is authenticated and:
   *      - no oldPassword
   *      - no newPassword
   *      - both oldPassword and newPassword are present and:
   *        - wrong oldPassword
   *        - successfull password change and logout
   *
   * If email is set, then then it is done in one of two steps, as for Case2:
   * Step1 --> password is forgotten, the user is logged out,
   * and their email is provided in a form (for OTP delivery) along with firstName and lastName.
   * These three will be used to fetch an existing user. If user found, user doc ID and
   * token will be linked, and we proceed to sending the OTP via email; otherwise error is sent.
   * All three are expected in req.body.
   * TEST:
   *   - response/behaviour on:
   *     - user is not authenticated and:
   *       - no email
   *       - no firstName
   *       - no lastName
   *       - otp successfully sent to email
   * Step2 --> OTP has been delivered, and is being
   * provided for password reset.
   * otp and newPassword are expected in req.body
   *
   * If both OTP and newPassword are provided:
   * - verify OTP
   *   - if OTP is verified:
   *     - use OTP to fetch user doc ID from link in Redis
   *       - if doc is found, it is used to reset password
   *         TEST:
   *           - response/behaviour on:
   *             - provided newPassword and valid OTP; user doc found, and:
   *               - successfull password reset
   *       - else no doc; error is sent
   *         TEST:
   *           - response/behaviour on:
   *             - provided newPassword and valid OTP, but no linked user ID
   *             - provided newPassword and valid OTP, but user not found with linked ID (deleted)
   *   - if OTP is unverified, error is sent
   *     TEST:
   *       - response/behaviour on:
   *         - provided newPassword, but invalid OTP
   *
   * Otherwise (if no oldPassword and newPassword, or no email), error is sent.
   *
   * In the first step, the
   * user's email, firstName, and lastName are expected, and in the req body (form).
   *
   * In the second step, the otp and newPassword are expected in the body.
   */
  static async putPassword(req, res) {
    // TODO: improve security by linking token with email
    const {
      oldPassword,
      newPassword,
      email,
      otp,
    } = req.body;

    let { firstName, lastName } = req.body;
    // console.log(email, firstName, lastName); // SCAFF
    // console.log('##########'); // SCAFF
    // console.log(Object.entries(req.query)); // SCAFF
    // console.log(Object.entries(req.body)); // SCAFF
    // console.log('##########'); // SCAFF

    // capitalize names for [case-sensitive] query search
    firstName = capitalize(firstName);
    lastName = capitalize(lastName);

    // console.log(email, firstName, lastName); // SCAFF

    // CASE1: user is logged in and wants to reset password
    if (oldPassword && newPassword && req.isAuthenticated()) {
      req.user.changePassword(oldPassword, newPassword, (err) => {
        if (err) {
          // likely wrong old password
          return res.status(401).json({ success: false, message: err.toString() });
        }

        // logout user and respond
        req.logout((err) => {
          if (err) {
            // probably some server error
            res.status(500).json({ success: false, message: err.toString() });
          }
          // logout successfull
          return res.json({ success: true, message: 'password successfully changed and user logged out' });
        });
        return undefined;
      });

      return undefined;
    }

    // CASE2: user has forgotten password; must be logged out

    // +++++check if OTP and newPassword provided+++++

    if (otp && newPassword && !req.isAuthenticated()) {
      // otp, and newPassword provided; attempt pwd reset
      // ensure newPassword is provided

      // verify token
      const verified = speakEasy.totp.verify({
        secret: secret.base32,
        encoding: 'base32',
        token: otp,
        window: 20,
      });
      if (!verified) {
        // invalid OTP
        return res.status(401).json({ success: false, message: 'invalid OTP' });
      }

      // +++++OTP verified+++++

      // retrieve user ID linked to OTP
      const value = await redisClient.get(otp); // as String
      if (!value) {
        // expired, or not linked in the first place
        return res.status(401).json({ success: false, message: 'OTP expired or invalid' });
      }
      // OTP linked to a user ID; unlink on retrieval
      await redisClient.del(otp);
      // get the user type and ID from return value
      const [userType, userId] = value.split(':');
      // retrieve the user doc based on ID and type
      let userDoc;
      if (userType === 'Agent') {
        userDoc = await Agent.findById(userId).exec();
      } else if (userType === 'Tenant') {
        userDoc = await Tenant.findById(userId).exec();
      }
      if (!userDoc) {
        // no linked document; probably deleted
        return res.status(401).json({ success: false, message: 'account not found; probably removed' });
      }

      // +++++user doc found+++++

      // process the doc
      userDoc.setPassword(newPassword, async (err, user, passwordErr) => {
        if (err) {
          // likely hashing algorithm error
          return res.status(500).json({ success: false, message: 'possible issues with hashing algorithm' });
        }
        if (passwordErr) {
          return res.status(401).json({ success: false, message: passwordErr.toString() });
        }
        // no errors
        try {
          await user.save();
          return res.json({ success: true, message: 'password reset complete' });
        } catch (err) {
          return res.status(500).json({ success: false, message: err.toString() });
        }
      });

      return undefined;
    }

    // +++++check if data provided for sending OTP+++++

    if (email && firstName && lastName) {
      // generate and send OTP
      /* =====generate OTP manually=====
      let otp = (Math.round(Math.random() * 999999)).toString();
      const padding = '0'.repeat(6 - otp.length);
      otp = `${otp}${padding}`;
      const jobData = {
        email,
        otp,
      };
      pwdQueue.add(job);
      ================================== */
      // check if user is a Tenant
      let userType;
      let userId = await Tenant.exists({
        email,
        firstName,
        lastName,
      }).exec();
      if (!userId) {
        // check if an Agent
        const userId = await Agent.exists({
          email,
          firstName,
          lastName,
        }).exec();
        if (!userId) {
          // no user found; send error
          return res.status(401).json({ success: false, message: 'no user found with such attributes'});
        }
        // else found in agents collection
        userType = 'Agent';
      } else {
        // found in tenants collection
        userType = 'Tenant';
      }

      // +++++user found with provided atttibutes+++++

      // extract the _id from the return of exists()
      userId = userId._id;

      // generate OTP with speakeasy module
      // generate a time-based OTP token based on the secret;
      // to be verified later with:
      // `speakEasy.totp.verify({secret: secret.base32, encoding: 'base32', token, window: 20})`
      // which uses a 10-minute window (1 window is 30 secs step by default),
      // meaning the token is valid for only about 10 minutes
      const otp = speakEasy.totp({ secret: secret.base32, encoding: 'base32' }); // hex and ascii key/encoding can be used
      console.log(otp); // SCAFF

      // add a job to the queue for sending emails with OTP
      const jobData = {
        otp,
        email,
      };
      const job = pwdQueue.add(jobData); // Promise
      // link generated OTP with user ID and type
      // console.log(Object.entries(userId), 538); // SCAFF
      const val = `${userType}:${userId.toString()}`;
      const expiration = 900; // 15 minutes
      await redisClient.set(otp, val, expiration);
      // respond based on job completion status
      job.then(() => {
        // job completed
        res.json({ success: true, message: 'sent OTP to email' });
      }).catch((err) => {
        // job failed
        res.status(500).json({ success: false, message: err ? err.toString() : 'OTP not sent' });
      });

      return undefined;
    }

    // ;;;;;edge cases;;;;;

    if (req.isAuthenticated()) {
      // user is authenticated
      return res.status(401).json({ success: false, message: 'no oldPassword and newPassword fields' });
    }

    // +++++not authenticated+++++

    if (!email) {
      return res.status(401).json({ success: false, message: 'no email field' });
    }

    if (!firstName) {
      return res.status(401).json({ success: false, message: 'no firstName field' });
    }

    if (!lastName) {
      return res.status(401).json({ success: false, message: 'no lastName field' });
    }

    if (!otp) {
      return res.status(401).json({ success: false, message: 'no otp field' });
    }

    if (!newPassword) {
      return res.status(401).json({ success: false, message: 'no newPassword field' });
    }
  }

  /**
   * Edits an authenticated user's data.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to the update of an authenticated user's profile.
   *
   * Algorithm:
   *
   * - if the user is authenticated,
   *   firstName, lastName, and phone are expected optional properties of req.body.
   *   Any one of them that is not undefined will be updated.
   *   TEST:
   *     - response/behaviour on:
   *       - user authenticated and:
   *         - no firstName
   *         - no lastName
   *         - no phone
   *         - successfull update
   *         - error during update
   *     - that data is actually updated in database
   * - if user is not authenticated, error is sent.
   *   TEST:
   *     - response/behaviour on:
   *       - user not authenticated
   */
  static async putUser(req, res) {
    if (req.isAuthenticated()) {
      // retrieve allowed update parameters
      let {
        firstName,
        lastName,
      } = req.body;
      const { phone } = req.body;
      firstName = capitalize(firstName);
      lastName = capitalize(lastName);

      const attrValues = [firstName, lastName, phone];
      const attrNames = ['firstName', 'lastName', 'phone'];
      const updateObj = {};
      // popultae `updateObj` with non-undefined attributes
      for (let i = 0; i < attrValues.length; i += 1) {
        if (attrValues[i]) {
          // value is supplied for the attribute
          updateObj[attrNames[i]] = attrValues[i];
        }
      }
      // get the user's doc
      const doc = req.user;
      // update doc with non-undefined attributes
      Object.assign(doc, updateObj);
      try {
        await doc.save();
        return res.status(201).json({ success: true, message: 'updated successfully' });
      } catch (err) {
        return res.status(401).json({ success: false, message: err.toString() });
      }
    }

    // user not authenticated
    return res.status(401).json({ success: false, message: 'user not logged in' });
  }

  /**
   * Returns an authenticated user's data.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to the data of the logged-in user.
   *
   * Algorithm:
   *
   * - if user is authenticated, their data is returned less their mongodb _id, salt, and hash.
   *   TEST:
   *     - response/behaviour on:
   *       - user is authenticated:
   *         - that a data object is sent
   *         - that the object does not contain _id, salt, and hash properties
   * - if not logged in, error is sent.
   *   TEST:
   *     - response/behaviour on:
   *       - user not authenticated
   */
  static async getUser(req, res) {
    // console.log('USER INSTANCE:', req.user.constructor, req.user instanceof Tenant); // SCAFF
    // console.log(Object.entries(req.session)); // SCAFF
    if (req.isAuthenticated()) {
      const user = req.user.toObject();
      delete user._id;
      delete user.salt;
      delete user.hash;
      if (req.user.listings instanceof Array) {
        // an agent; indicate
        user.isAgent = true;
      } else {
        user.isAgent = false;
      }
      return res.json(user);
    }

    // not logged in
    return res.status(401).json({ success: false, message: 'session not authenticated' });
  }

  /**
   * Deletes a specific user's account.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to the removal
   * ...of all documents and records relating to a user.
   *
   * Algorithm:
   *
   * - if userId is provided, it is assumed to be by an
   *   admin user, and attempt is made to remove the account.
   *   If the ID is not valid, error is sent.
   *   If no user doc is found with the ID, error is sent.
   *   Note that at present, if no user doc is found,
   *   the requesting user's account is deleted instead, if they are logged in.
   *   userId is expected in req.query.
   *   TEST:
   *     - response/behaviour on:
   *       - invalid userId
   *       - no user doc found for userId (next IF)
   *       - successfull removal of user account
   *     - that all linked house listing and Rating docs are actually removed from the
   *       database, on successfull removal of the user account
   * - if userId is not provided, or no user doc found for it,
   *   the requesting user will have their account deleted.
   *   TEST:
   *     - response/behaviour on:
   *       - user is authenticated
   *         - successfull removal of user account
   *     - that all linked house listing and Rating docs are actually removed from the
   *       database, on successfull removal of user account
   *
   * - if user is not authenticated, error is sent.
   *   TEST:
   *     - response/behaviour on:
   *       - user not authenticated
   */
  static async deleteUser(req, res) {
    // TODO: add email of deleted user to blacklist
    // TODO: create special admin user account for using userId
    // retrieve userId query param, if present
    let { userId } = req.query;
    if (userId) {
      // retrieve doc using the userId if provided; otherwise use req.user
      try {
        userId = new mongoose.Types.ObjectId(userId);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'invalid ObjectId string' });
      }
      let userDoc;
      userDoc = await Agent.findById(userId).exec();
      if (!userDoc) {
        // try fetching a Tenant
        userDoc = await Tenant.findById(userId).exec();
      }

      if (userDoc) {
        // TODO: refactor to remove duplicate code; START1
        // a user with that ID found
        // if an agent, remove all Ratings doc linked to it
        // if an agent, also remove all houses linked to it
        if (userDoc.listings instanceof Array) {
          // agent account
          const { listings } = userDoc;
          for await (const houseId of listings) {
            // remove all linked houses
            const houseDoc = await House.findById(houseId).exec();
            await houseDoc.deleteOne();
          }

          const ratingDocs = await Rating.find({ agentId: userDoc._id }).exec();
          for await (const ratingDoc of ratingDocs) {
            // remove all linked ratings
            await ratingDoc.deleteOne();
          }
        }

        // remove doc from mongodb
        await userDoc.deleteOne();

        return res.json({ success: true, message: 'account unlinking complete' });
        // TODO: END1
      }
      return undefined;
    }

    if (req.isAuthenticated()) {
      // delete the currently logged-in user
      const userDoc = req.user;

      // TODO: refactor to remove duplicate code; START1
      // if an agent, remove all Ratings doc linked to it
      // if an agent, remove all houses linked to it
      if (userDoc.listings instanceof Array) {
        // agent account
        const { listings } = userDoc;
        for await (const houseId of listings) {
          // remove all linked houses
          const houseDoc = await House.findById(houseId).exec();
          await houseDoc.deleteOne();
        }

        const ratingDocs = await Rating.find({ agentId: userDoc._id }).exec();
        for await (const ratingDoc of ratingDocs) {
          // remove all linked ratings
          await ratingDoc.deleteOne();
        }
      }

      // remove doc from mongodb
      await userDoc.deleteOne();

      return res.json({ success: true, message: 'account unlinking complete' });
      // TODO: END1
    }

    // not logged in
    return res.status(401).json({ success: false, message: 'not allowed' });
  }

  /**
   * Links a review to a specific agent.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to the
   * ...addition of a review to Agent.reviews and creation of a Rating.
   *
   * Algorithm:
   *
   * This route will handle creation and update of user reviews on an agent.
   * A review is composed of a rating and a comment.
   * Three input are expected: rating and comment as [sometimes] required and
   * optional properties of req.body respectively, and agentId as a required URI parameter.
   * rating is only required if the user has posted no previous review on the specified agent.
   * TEST:
   *   - response/behaviour on:
   *     - user is authenticated and:
   *       - no/invalid agentId
   *
   * If the user is authenticated and has a previous review, it will be updated with the
   * comment and rating, if they are defined.
   * rating is not required in this case.
   * Agent.rating will be re-calculated if rating is
   * provided and it's different from the previous one.
   * Also, the linked Rating doc will be updated with the new rating, if provided.
   * TEST:
   *   - response/behaviour on:
   *     - user is authenticated and:
   *       - user has previous review and:
   *         - no rating
   *         - invalid rating
   *         - no comment
   *         - successfull update of review and Rating.tenantRating,
   *         and recalculation of Agent.rating
   *         - no linked Rating doc
   *   - that review, Agent.rating, and Rating.tenantRating are affected in DB on update
   *
   * If the user is logged in and doesn't have a previous review,
   * a new one will be created and pushed to Agent.reviews.
   * rating is required in this case.
   * Agent.rating will be re-calculated. Also, a new Rating doc will be created with the new rating
   * TEST:
   *   - response/behaviour on:
   *     - user is authenticated and:
   *       - user does not have previous review and:
   *         - no rating
   *         - invalid rating
   *         - no comment
   *         - successfull creation of review and Rating.tenantRating,
   *         and recalculation of Agent.rating
   *         - failed creation of Rating doc
   *   - that review, Agent.rating, and rating doc are affected in DB on creation
   *
   * If the user doesn't provide a rating and doesn't have a previous review as well, error is sent
   * TEST:
   *   - response/behaviour on:
   *     - user is authenticated and:
   *       - no rating and no previous review subdoc
   *
   * If user is not authenticated, error is sent.
   * TEST:
   *   - response/behaviour on:
   *     - user not authenticated
   */
  static async postReview(req, res) {
    // IF user is authenticated continue
    if (req.isAuthenticated()) {
      // fetch `comment` and `rating` fields
      const { comment, rating } = req.body;

      // retrieve the agent doc by specified ID
      // get and validate ID
      let { agentId } = req.params;
      try {
        agentId = new mongoose.Types.ObjectId(agentId);
      } catch (err) {
        return res.status(400).json({ success: false, message: err.toString() });
      }

      // retrieve doc
      const agentDoc = await Agent.findById(agentId).exec();
      // ----IF no such agent (doc===null), return error
      if (!agentDoc) {
        // no agent found
        return res.status(400).json({ success: false, message: 'no agent found' });
      }

      // check if user had previously posted a rating
      let userReviewSubdoc;
      for (const obj of agentDoc.reviews) {
        if (obj.userId.toString() === req.user._id.toString()) {
          // retrieve their review as a subdoc
          userReviewSubdoc = obj;
          break;
        }
      }

      // IF no rating, old or new, return error
      if (!rating && !userReviewSubdoc) {
        // no new or previous rating, which is required
        return res.status(400).json({ success: false, message: 'no `rating` field' });
      }

      if (userReviewSubdoc) {
        // previous review exists; update Agent and Rating
        const oldRating = userReviewSubdoc.rating; // save old
        if (rating) {
          // replace with new
          userReviewSubdoc.rating = rating;
        }
        if (comment) {
          userReviewSubdoc.comment = comment;
        }

        try {
          // save agent doc to persist change in subdoc;
          // invalid types will throw from mongoose validation
          await agentDoc.save();

          // TODO: update Agent.reviews.rating and
          // recalculate Agent.rating when review is later edited/updated;
          // this implementation takes care of both cases (old and new reviews)
          // update Agent rating if old and new rating different
          if (rating && (rating.toString() !== oldRating.toString())) {
            const totalReviews = agentDoc.reviews.length;
            const prevTotal = agentDoc.rating * totalReviews;
            const newRating = Number(rating);
            agentDoc.rating = (prevTotal - oldRating + newRating) / totalReviews;
            await agentDoc.save();
          }

          // fetch the corresponding Rating doc to update with the new rating
          // TODO: issue with two Rating docs with same tenant and agent ID;
          // ...could be solved by including Rating ID in req.
          const filterDoc = { tenantId: req.user._id, agentId };
          const ratingDoc = await Rating.findOne(filterDoc).exec();
          if (!ratingDoc) {
            return res.status(400).json({ success: false, message: 'no linked Rating document' });
          }

          // +++++Rating doc found+++++

          // update linked rating doc
          ratingDoc.tenantRating = rating || oldRating;
          // save rating doc
          await ratingDoc.save();
          return res.status(201).json({ success: true, message: 'review successfully updated' });
        } catch (err) {
          // error in saving docs
          return res.status(400).json({ success: false, message: err.toString() });
        }
      }

      if (!userReviewSubdoc) {
        // no previous review; create and link new review
        // ------prepare a POJO with comment and rating
        const reviewDoc = {
          user: {
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            id: req.user._id,
          },
          rating,
          comment,
        };

        // ------push POJO to doc.reviews and save doc
        // ------IF save successfull (no validation/server error)
        // --------create a Rating doc with the rating and IDs
        // --------save the doc
        // --------IF save successfull, return success; ELSE error
        // ------ELSE return error
        agentDoc.reviews.push(reviewDoc);
        try {
          // TODO: save agentDoc and ratingDoc in separate
          // ...try/catch blocks for better error handling.
          await agentDoc.save();

          // new review; update Agent.rating
          const totalReviews = agentDoc.reviews.length;
          const prevTotal = agentDoc.rating * (totalReviews - 1);
          const newRating = Number(rating);
          agentDoc.rating = (prevTotal + newRating) / totalReviews;
          await agentDoc.save();

          // create a Rating doc with the rating and IDs
          const ratingDoc = new Rating({
            tenantId: req.user._id,
            tenantRating: rating,
            agentId,
          });
          // save rating doc;
          // casting and validation are done before save()
          await ratingDoc.save();
          return res.status(201).json({ success: true, message: 'review successfully linked to agent' });
        } catch (err) {
          // error in saving docs
          return res.status(400).json({ success: false, message: err.toString() });
        }
      }
      return undefined;
    }

    // ELSE return authorization error
    return res.status(401).json({ success: false, message: 'user not logged in' });
  }
}

module.exports = UserController;
