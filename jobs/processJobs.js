require('dotenv').config();
const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const Tenant = require('../models/Tenant');
const { bookHouseQueue, resetPassword } = require('./queue');
const sendEmail = require('../utils/sendEmail');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/latent';

// Establish database connection
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected');
  })
  .catch((err) => console.log(err.message));

// Process jobs: Sends emails to both tenant and agent for house inspection;
bookHouseQueue.process(async (job) => {
  try {
    const {
      tenantId, agentId, houseDescription, houseAddress,
    } = job.data;
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) throw new Error('No tenant found');
    const agent = await Agent.findById(agentId);
    if (!agent) throw new Error('No agent found');
    console.log(agent)

    // Format the tenant message with inline CSS
    const tenantMessage = `
      <h2 style="color: #007bff;">Hello ${tenant.firstName},</h2>
      <p>You have indicated interest in inspecting a house listed by ${agent.firstName}.</p>
      <h3>House Details:</h3>
      <p><strong>Address:</strong> ${houseAddress}</p>
      <p><strong>Description:</strong> ${houseDescription}</p>
      <p><strong>Agent/Owner's contact:</strong> ${agent.phone}</p>
      <p>Please kindly contact the agent.</p>
      <p>Thank you for choosing Latent for your housing services.</p>
    `;

    // Format the agent message with inline CSS
    const agentMessage = `
      <h2 style="color: #007bff;">Hello ${agent.firstName},</h2>
      <p>There is a potential tenant by the name of ${tenant.firstName} who is interested in your house.</p>
      <h3>House Details:</h3>
      <p><strong>Address:</strong> ${houseAddress}</p>
      <p><strong>Description:</strong> ${houseDescription}</p>
      <p>Your contact has been shared with the tenant.</p>
      <p>Thank you for choosing Latent for your housing services.</p>
    `;

    const mailOptions = [
      {
        from: `Latent ${process.env.EMAIL}`,
        to: tenant.email,
        subject: 'House inspection',
        html: tenantMessage, // Set the tenant message to use HTML
      },
      {
        from: `Latent ${process.env.EMAIL}`,
        to: agent.email,
        subject: 'House inspection',
        html: agentMessage, // Set the agent message to use HTML
      },
    ];

    console.log(mailOptions);

    // Using for...of loop to ensure asynchronous email sending
    for (const mailOption of mailOptions) {
      await sendEmail(mailOption);
    }
  } catch (err) {
    console.error(err.message);
  }
});



// Handle sending of OTP to user email for password reset
resetPassword.process(async (job) => {
  try {
    const { email, otp } = job.data;

    // Format the email message with HTML
    const message = `<p>This is your one-time password (OTP) for resetting your Latent login password:</p>
                     <p style="font-weight: bold; font-size: 16px;">${otp}</p>
                     <p>This OTP is valid only for 10 minutes.</p>
                     <p>Thank you for choosing Latent for your housing needs and services!</p>`;

    const mailOptions = {
      from: `Latent ${process.env.EMAIL}`,
      to: email,
      subject: 'Password reset',
      html: message, // Set the email body to use HTML
    };

    await sendEmail(mailOptions);
  } catch (err) {
    console.log(err.message);
  }
});
