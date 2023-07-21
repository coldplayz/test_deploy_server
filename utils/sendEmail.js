require('dotenv').config();
const nodemailer = require('nodemailer');

const { EMAIL, EMAIL_APP_PASSWORD } = process.env;
const transporter = nodemailer.createTransport({
  service: 'gmail', // Specify the email service provider (e.g., Gmail)
  auth: {
    user: EMAIL,
    pass: EMAIL_APP_PASSWORD,
  },
});

const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendEmail;
