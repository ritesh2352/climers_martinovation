const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const nodemailer = require("nodemailer");

const hasAppPassword = Boolean(process.env.EMAIL_PASSWORD);
const hasOAuthConfig = Boolean(
  process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.REFRESH_TOKEN,
);

if (!process.env.EMAIL_USER || (!hasAppPassword && !hasOAuthConfig)) {
  throw new Error(
    "Missing email configuration. Set EMAIL_USER and either EMAIL_PASSWORD or Gmail OAuth2 env vars.",
  );
}

const transporter = nodemailer.createTransport(
  hasAppPassword
    ? {
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      }
    : {
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: process.env.EMAIL_USER,
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          refreshToken: process.env.REFRESH_TOKEN,
        },
      },
);

transporter.verify((error) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

const sendRegistrationEmail = async (userEmail, name) => {
  const subject = "Registration Confirmation";
  const text = `Thank you for registering, ${name}!`;
  const html = `<p>Thank you for registering, <b>${name}</b>!</p>`;

  await sendEmail(userEmail, subject, text, html);
};

const sendLoginNotificationEmail = async (userEmail, name) => {
  const subject = "Login Notification";
  const text = `Hello ${name}, you have successfully logged in.`;
  const html = `<p>Hello <b>${name}</b>, you have successfully logged in.</p>`; 

  await sendEmail(userEmail, subject, text, html);
};

 const sendPasswordResetEmail = async (userEmail, resetLink) => {
  const subject = "Password Reset Request";
  const text = `Reset your password using this link (valid for 15 minutes): ${resetLink}`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetLink}">Click here to reset your password</a></p>
    <p>This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
  `;

  await sendEmail(userEmail, subject, text, html);
};

const sendFailedAttemptsWarningEmail = async (userEmail, attempts) => {
  const subject = "Security Alert: Multiple Failed Login Attempts";
  const text = `Hello ${userEmail}, we detected ${attempts} failed login attempts on your account. If this wasn't you, please reset your password. Your account will be frozen after 5 failed attempts.`;
  const html = `
    <p>Hello <b>${userEmail}</b>,</p>
    <p>We detected <b>${attempts} failed login attempts</b> on your account.</p>
    <p>If this wasn't you, please reset your password. Your account will be temporarily frozen after 5 failed attempts.</p>
  `;
  await sendEmail(userEmail, subject, text, html);
};

const sendAccountFrozenEmail = async (userEmail, minutes) => {
  const subject = "Your Account Has Been Frozen";
  const text = `Hello ${userEmail}, your account has been frozen for ${minutes} minutes due to multiple failed login attempts.`;
  const html = `
    <p>Hello <b>${userEmail  }</b>,</p>
    <p>Your account has been <b>frozen for ${minutes} minutes</b> due to multiple failed login attempts.</p>
    <p>Otherwise you can try again after the freeze ends.</p>
  `;
  await sendEmail(userEmail, subject, text, html);
};



module.exports = { sendEmail, sendRegistrationEmail, sendLoginNotificationEmail, sendPasswordResetEmail, sendFailedAttemptsWarningEmail, sendAccountFrozenEmail };