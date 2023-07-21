const { expect } = require('chai');
// const Tenant = require('../models/Tenant');
// const Agent = require('../models/Agent');

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
describe('Test', function () {
  // test fixtures
  const agentLogins = [
    {
      testCase: 'valid credentials',
      email: 'a1@gmail.com',
      password: 'a1pwd',
      code: 200,
      expected: { success: true, message: 'authenticated' },
    },
    {
      testCase: 'no email',
      password: 'a1pwd',
      code: 401,
      expected: { success: false, message: 'authentication failed' },
    },
    {
      testCase: 'no password',
      email: 'a1@gmail.com',
      code: 401,
      expected: { success: false, message: 'authentication failed' },
    },
    {
      testCase: 'invalid email',
      email: 'fake@gmail.com',
      password: 'a1pwd',
      code: 401,
      expected: { success: false, message: 'authentication failed' },
    },
    {
      testCase: 'invalid password',
      email: 'a1@gmail.com',
      password: 'fake',
      code: 401,
      expected: { success: false, message: 'authentication failed' },
    },
  ];

  const tenantLogins = [
    {
      testCase: 'valid credentials',
      email: 't1@gmail.com',
      password: 't1pwd',
      code: 200,
      expected: { success: true, message: 'authenticated' },
    },
    {
      testCase: 'no email',
      password: 't1pwd',
      code: 401,
      expected: { success: false, message: 'authentication failed' },
    },
    {
      testCase: 'no password',
      email: 't1@gmail.com',
      code: 401,
      expected: { success: false, message: 'authentication failed' },
    },
    {
      testCase: 'invalid email',
      email: 'fake@gmail.com',
      password: 't1pwd',
      code: 401,
      expected: { success: false, message: 'authentication failed' },
    },
    {
      testCase: 'invalid password',
      email: 't1@gmail.com',
      password: 'fake',
      code: 401,
      expected: { success: false, message: 'authentication failed' },
    },
  ];

  describe('Agent login on', function () {
    agentLogins.forEach(function ({
      testCase,
      email,
      password,
      code,
      expected,
    }) {
      // define test cases
      // req
      // url
      // body
      // reqOpts
      // req.post
      it(testCase, function (done) {
        const req = this.rq;
        const url = `${this.baseUrl}/login`;
        const body = {
          email,
          password,
        };
        const reqOpts = {
          url,
          body,
        };

        req.post(reqOpts, (err, res, bdy) => {
          expect(res.statusCode).to.eq(code);
          expect(bdy).to.deep.equal(expected);
          if (testCase === 'valid credentials') {
            // test response on user already logged in
            req.post(reqOpts, (err, res, bdy) => {
              expect(res.statusCode).to.equal(401);
              const exp = { success: false, message: 'already authenticated' };
              expect(bdy).to.deep.equal(exp);
            });
          }
          done();
        });
      });
    });
  });

  describe('Tenant login on', function () {
    tenantLogins.forEach(function ({
      testCase,
      email,
      password,
      code,
      expected,
    }) {
      // define test cases
      // req
      // url
      // body
      // reqOpts
      // req.post
      it(testCase, function (done) {
        const req = this.rq;
        const url = `${this.baseUrl}/login`;
        const body = {
          email,
          password,
        };
        const reqOpts = {
          url,
          body,
        };

        req.post(reqOpts, (err, res, bdy) => {
          expect(res.statusCode).to.eq(code);
          expect(bdy).to.deep.equal(expected);
          if (testCase === 'valid credentials') {
            // test response on user already logged in
            req.post(reqOpts, (err, res, bdy) => {
              expect(res.statusCode).to.equal(401);
              const exp = { success: false, message: 'already authenticated' };
              expect(bdy).to.deep.equal(exp);
            });
          }
          done();
        });
      });
    });
  });
});
