const { expect } = require('chai');
// const Tenant = require('../models/Tenant');
// const Agent = require('../models/Agent');

/**
 * - req.body should contain firstName, lastName, email, password, and
 *   isAgent as required properties, and phone as an optional property.
 *   TEST:
 *     - response/behaviour on:
 *       - no firstName; DONE
 *       - no lastName; DONE
 *       - no email; DONE
 *       - no password; DONE
 *       - no isAgent; DONE
 *       - no phone; DONE
 *       - all data; DONE
 * - user is registered as a Tenant or Agent, depending on the isAgent flag.
 *   If the email is already registered in the collection, an error is sent, else
 *   registration is successfull and the user is logged in.
 *   TEST:
 *     - response/behaviour on:
 *       - already-registered email; DONE
 *     - that user is logged-in after successfull registration
 *     - that user document is actually created in DB
 */

/**
 * Tests for Tenant and Agent creation.
 */
describe('Test', function () {
  // prepare test parameters
  const tenants = [
    {
      testCase: 'all data',
      firstName: 'Greenbel',
      lastName: 'Eleghasim',
      email: 'obisann@gmail.com',
      password: 'greenbelpwd',
      phone: '2348103665556',
      isAgent: 'false',
      code: 201,
      expected: { success: true, message: 'created and logged-in successfully' },
    },
    {
      testCase: 'no firstName',
      lastName: 'Eleghasim',
      email: 'obisann2@gmail.com',
      password: 'greenbelpwd',
      phone: '2348103665556',
      isAgent: 'false',
      code: 400,
      expected: { success: false, message: 'ValidationError: firstName: first name missing' },
    },
    {
      testCase: 'no lastName',
      firstName: 'Greenbel',
      email: 'obisann2@gmail.com',
      password: 'greenbelpwd',
      phone: '2348103665556',
      isAgent: 'false',
      code: 400,
      expected: { success: false, message: 'ValidationError: lastName: last name missing' },
    },
    {
      testCase: 'no email',
      firstName: 'Greenbel',
      lastName: 'Eleghasim',
      password: 'greenbelpwd',
      phone: '2348103665556',
      isAgent: 'false',
      code: 400,
      expected: { success: false, message: 'MissingUsernameError: No username was given' },
    },
    {
      testCase: 'no password',
      firstName: 'Greenbel',
      lastName: 'Eleghasim',
      email: 'obisann2@gmail.com',
      phone: '2348103665556',
      isAgent: 'false',
      code: 400,
      expected: { success: false, message: 'password missing' },
    },
    {
      testCase: 'no phone',
      firstName: 'Greenbel',
      lastName: 'Eleghasim',
      email: 'obisann3@gmail.com',
      password: 'greenbelpwd',
      isAgent: 'false',
      code: 201,
      expected: { success: true, message: 'created and logged-in successfully' },
    },
    {
      testCase: 'no isAgent',
      firstName: 'Greenbel',
      lastName: 'Eleghasim',
      email: 'obisann2@gmail.com',
      password: 'greenbelpwd',
      phone: '2348103665556',
      code: 400,
      expected: { success: false, message: 'isAgent missing' },
    },
    {
      testCase: 'same email',
      firstName: 't1firstName',
      lastName: 't1lastName',
      email: 't1@gmail.com',
      password: 't1pwd',
      phone: '2347064859204',
      isAgent: 'false',
      code: 400,
      expected: { success: false, message: 'UserExistsError: A user with the given username is already registered' },
    },
  ];

  const agents = [
    {
      testCase: 'all data',
      firstName: 'Tochukwu',
      lastName: 'Eleghasim',
      email: 'tochi@gmail.com',
      password: 'tochukwupwd',
      phone: '234111111111',
      isAgent: 'true',
      code: 201,
      expected: { success: true, message: 'created and logged-in successfully' },
    },
    {
      testCase: 'no firstName',
      lastName: 'Eleghasim',
      email: 'tochi2@gmail.com',
      password: 'tochukwupwd',
      phone: '234111111111',
      isAgent: 'true',
      code: 400,
      expected: { success: false, message: 'ValidationError: firstName: first name missing' },
    },
    {
      testCase: 'no lastName',
      firstName: 'Tochukwu',
      email: 'tochi2@gmail.com',
      password: 'tochukwupwd',
      phone: '234111111111',
      isAgent: 'true',
      code: 400,
      expected: { success: false, message: 'ValidationError: lastName: last name missing' },
    },
    {
      testCase: 'no email',
      firstName: 'Tochukwu',
      lastName: 'Eleghasim',
      password: 'tochukwupwd',
      phone: '234111111111',
      isAgent: 'true',
      code: 400,
      expected: { success: false, message: 'MissingUsernameError: No username was given' },
    },
    {
      testCase: 'no password',
      firstName: 'Tochukwu',
      lastName: 'Eleghasim',
      email: 'tochi2@gmail.com',
      phone: '234111111111',
      isAgent: 'true',
      code: 400,
      expected: { success: false, message: 'password missing' },
    },
    {
      testCase: 'no phone',
      firstName: 'Tochukwu',
      lastName: 'Eleghasim',
      email: 'tochi3@gmail.com',
      password: 'tochukwupwd',
      isAgent: 'true',
      code: 201,
      expected: { success: true, message: 'created and logged-in successfully' },
    },
    {
      testCase: 'no isAgent',
      firstName: 'Tochukwu',
      lastName: 'Eleghasim',
      email: 'tochi2@gmail.com',
      password: 'greenbelpwd',
      phone: '234111111111',
      code: 400,
      expected: { success: false, message: 'isAgent missing' },
    },
    {
      testCase: 'same email',
      firstName: 'a1firstName',
      lastName: 'a1lastName',
      email: 'a1@gmail.com',
      password: 't1pwd',
      phone: '2347064859204',
      isAgent: 'true',
      code: 400,
      expected: { success: false, message: 'UserExistsError: A user with the given username is already registered' },
    },
  ];

  describe('Agent creation when', function () {
    agents.forEach(function ({
      testCase,
      firstName,
      lastName,
      email,
      password,
      phone,
      isAgent,
      code,
      expected,
    }) {
      // define test cases
      it(testCase, function (done) {
        // console.log(this.rq, req); // SCAFF
        // console.log(this.baseUrl); // SCAFF
        const req = this.rq;
        const url = `${this.baseUrl}/users`;
        const tData = {
          firstName,
          lastName,
          email,
          password,
          phone,
          isAgent,
        };
        const reqOpts = {
          body: tData,
          url,
        };
        req.post(reqOpts, (err, res, bdy) => {
          if (err) {
            done(err);
          }
          expect(res.statusCode).to.eq(code);
          expect(bdy).to.deep.equal(expected);
          if (testCase === 'all data') {
            // test that the user is logged in
            req.get(`${this.baseUrl}/ping`, (err, res, bdy) => {
              if (err) {
                done(err);
              }
              const exp = { success: true, message: 'auth pong' };
              expect(bdy).to.deep.equal(exp);
            });
          }
          done();
        });
      });
    });
  });

  describe('Tenant creation when', function () {
    tenants.forEach(function ({
      testCase,
      firstName,
      lastName,
      email,
      password,
      phone,
      isAgent,
      code,
      expected,
    }) {
      // define test cases
      it(testCase, function (done) {
        const req = this.rq;
        const url = `${this.baseUrl}/users`;
        const tData = {
          firstName,
          lastName,
          email,
          password,
          phone,
          isAgent,
        };
        const reqOpts = {
          body: tData,
          url,
        };
        req.post(reqOpts, (err, res, bdy) => {
          if (err) {
            done(err);
          }
          expect(res.statusCode).to.eq(code);
          expect(bdy).to.deep.equal(expected);
          if (testCase === 'all data') {
            // test that the user is logged in
            req.get(`${this.baseUrl}/ping`, (err, res, bdy) => {
              if (err) {
                done(err);
              }
              const exp = { success: true, message: 'auth pong' };
              expect(bdy).to.deep.equal(exp);
            });
          }
          done();
        });
      });
    });
  });
});
