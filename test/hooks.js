const request = require('request');
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const Agent = require('../models/Agent');

// console.log('IN root hook plugin...'); // SCAFF

const MONGO_URI = 'mongodb://localhost/testdb';

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('connected to MongoDB!');
  })
  .catch((err) => console.log(err.message));

// register root hooks to be executed for all test files
exports.mochaHooks = {
  beforeAll(done) {
    // let n = 0; // SCAFF
    // console.log('POINT NUMBER:', ++n); // SCAFF

    const baseUrl = 'http://localhost:5000/api/v1';
    this.timeout(5000);

    this.baseUrl = baseUrl;
    // enable cookies for all requests, and json body
    const baseRequest = request.defaults({ jar: true, json: true });
    this.rq = baseRequest;
    // console.log('#########', baseRequest); // SCAFF
    // create default/dummy tenant and agent
    const tData = {
      firstName: 't1firstName',
      lastName: 't1lastName',
      email: 't1@gmail.com',
      password: 't1pwd',
      phone: '2347064859204',
      isAgent: 'false',
    };
    const aData = {
      firstName: 'a1firstName',
      lastName: 'a1lastName',
      email: 'a1@gmail.com',
      password: 'a1pwd',
      isAgent: 'true',
    };
    const reqOpts = {
      url: 'http://localhost:5000/api/v1/users',
      body: tData,
    };

    // console.log('POINT NUMBER:', ++n); // SCAFF

    // logout from any active session
    const url = `${this.baseUrl}/logout`;
    this.rq.post(url, () => {
      // console.log('logout done!'); // SCAFF

      // logout done; create dummy tenant and agent
      baseRequest.post(reqOpts, (err, res, bdy) => {
        // console.log('#########', err, res, bdy); // SCAFF
        if (res.statusCode === 201) {
          // tenant creation success;
          // logout tenant and...
          baseRequest.post('http://localhost:5000/api/v1/logout', (err) => {
            if (err) {
              // console.log('issues logging out dummy tenant......'); // SCAFF
              done(err);
            }
            // ...create agent
            reqOpts.body = aData;
            baseRequest.post(reqOpts, (err, res, bdy) => {
              if (res.statusCode !== 201) {
                // console.log('issues creating dummy agent......'); // SCAFF
                console.log(res.statusCode, bdy);
              }

              if (err) {
                done(err);
              } else {
                // console.log('created dummy agent; logging out......'); // SCAFF
                // logout agent
                baseRequest.post('http://localhost:5000/api/v1/logout', (err) => {
                  if (err) {
                    // console.log('issues logging out dummy agent......'); // SCAFF
                    done(err);
                  } else {
                    // console.log('logout successfull; calling done...'); // SCAFF
                    done();
                  }
                });
              }
              // console.log('code!==201; no err; then what?......'); // SCAFF
            });
          });
        } else {
          // tenant creation failed
          // console.log('issues creating dummy tenant......'); // SCAFF
          console.log(res.statusCode, bdy);

          if (err) {
            done(err);
          } else {
            done();
          }
        }
      });
    });
  },
  async afterAll() {
    // drop agent and tenant collections; clean up
    this.timeout(5000);
    await Tenant.deleteMany({}).exec();
    await Agent.deleteMany({}).exec();
  },
  afterEach(done) {
    // logout from session
    const url = `${this.baseUrl}/logout`;
    this.rq.post(url, () => {
      done();
    });
  },
};
