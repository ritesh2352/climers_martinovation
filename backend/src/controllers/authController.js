const mongoose = require("mongoose");
const userModel = require("../models/userModel");
const tokenBlackListModel = require("../models/tokenBlackListModel");
const { getClientInfo } = require("../utils/clientInfo");
const FailedLogin = require("../models/falidModel");
const PasswordReset = require("../models/passwordResetModel");
const {
  sendRegistrationEmail,
  sendLoginNotificationEmail,
  sendPasswordResetOtp,
  sendFailedAttemptsWarningEmail,
  sendAccountFrozenEmail,
} = require("../servise/emailServise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESET_TOKEN_LIFETIME_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function hashResetValue(value) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(value)
    .digest("hex");
}

const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd, // HTTPS only in production
  sameSite: isProd ? "none" : "lax", // cross-domain on Render, simple locally
  maxAge: 24 * 60 * 60 * 1000, // 1 day, matches the JWT expiry
};

function signToken(user, client = {}) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: user._id,
      userName: user.userName,
      country: client.country,
      device: client.device,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
}

async function registerUser(req, res) {
  try {
    const { userName, email, password } = req.body || {};

    if (
      typeof userName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !userName.trim() ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "please provide userName, email and password" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "password must be at least 8 characters" });
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const normalizedUserName = userName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const userAlreadyExist = await userModel.findOne({
      $or: [{ userName: normalizedUserName }, { email: normalizedEmail }],
    });

    if (userAlreadyExist) {
      if (userAlreadyExist.userName === normalizedUserName) {
        return res.status(409).json({ message: "userName already exists" });
      }
      return res.status(409).json({ message: "email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      userName: normalizedUserName,
      email: normalizedEmail,
      password: hash,
    });

    try {
      await sendRegistrationEmail(user.email, user.userName);
    } catch (emailError) {
      console.error("Registration email failed:", emailError);
    }

    const client = getClientInfo(req);
    res.cookie("token", signToken(user, client), cookieOptions);

    return res.status(201).json({
      message: "user registered successfully",
      user: { id: user._id, userName: user.userName, email: user.email },
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "userName or email already registered" });
    }
    return res.status(500).json({ message: "server error" });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body || {};
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "please provide email and password" });
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const client = getClientInfo(req);
    const normalizedEmail = email.trim().toLowerCase();
    const activeSince = new Date(Date.now() - 30_000);
    const recentFailures = { createdAt: { $gt: activeSince } };
    const ipFails = await FailedLogin.countDocuments({
      ...recentFailures,
      ip: client.ip,
    });
    const deviceFails = await FailedLogin.countDocuments({
      ...recentFailures,
      device: client.device,
    });
    const userFails = await FailedLogin.countDocuments({
      ...recentFailures,
      email: normalizedEmail,
    });
   
 if(userFails >=0){
  await sendFailedAttemptsWarningEmail(normalizedEmail, userFails);
 }
   
    let risk = 0;
    const reasons = [];
    if (ipFails >= 5) {
      risk += 40;
      reasons.push(`${ipFails} failed logins from this IP`);
    }
    if (deviceFails >= 5) {
      risk += 30;
      reasons.push(`${deviceFails} failed logins from this device`);
    }
    if (userFails >= 5) {
      risk += 40;
      reasons.push(`${normalizedEmail} failed logins on this account`);
    }

    if (risk >= 60) {
      await sendAccountFrozenEmail(normalizedEmail, 15);
      return res
        .status(429)
        .json({message: "Too many attempts, try later", reasons });
    
    }

    const user = await userModel.findOne({ email: normalizedEmail });
    const ok = user && (await bcrypt.compare(password, user.password));

    if (!ok) {
      await FailedLogin.create({
        ip: client.ip,
        device: client.device,
        email: normalizedEmail,
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await FailedLogin.deleteMany({ email: normalizedEmail });
    res.cookie("token", signToken(user, client), cookieOptions);

    try {
      await sendLoginNotificationEmail(user.email, user.userName);
    } catch (emailError) {
      console.error("Login notification email failed:", emailError);
    }

    return res.status(200).json({
      message: "logged in successfully",
      user: { id: user._id, userName: user.userName, email: user.email },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
}

async function logoutUser(req, res) {
  try {
    const token = req.cookies?.token;
    if (token) {
      await tokenBlackListModel.updateOne(
        { token },
        { $setOnInsert: { token } },
        { upsert: true },
      );
    }
 
    const { maxAge, ...clearOptions } = cookieOptions; // same options, minus maxAge
    res.clearCookie("token", clearOptions);

    return res.status(200).json({ message: "user logged out successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
}

async function getMe(req, res) {
  try {
    if (!req.user?.id || !mongoose.isValidObjectId(req.user.id)) {
      return res.status(401).json({ message: "invalid token" });
    }
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    return res.status(200).json({
      message: "user detail fetched successfully",
      user: { id: user._id, userName: user.userName, email: user.email },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Please provide your email address." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userModel.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "No account was found for that email address." });
    }

    const now = Date.now();
    let challenge = await PasswordReset.findOne({ email: normalizedEmail });
    if (challenge && now - challenge.createdAt.getTime() < 60_000) {
      return res.status(429).json({ message: "Please wait before requesting another code." });
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    challenge = await PasswordReset.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          otpHash: hashResetValue(otp),
          otpExpiresAt: new Date(now + OTP_LIFETIME_MS),
          otpAttempts: 0,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    try {
      await sendPasswordResetOtp(normalizedEmail, otp);
    } catch (emailError) {
      await PasswordReset.deleteOne({ _id: challenge._id });
      throw emailError;
    }

    return res.status(200).json({ message: "A password reset code has been sent to your email." });
  } catch (error) {
    console.error("Password reset email failed:", error);
    return res.status(500).json({ message: "Unable to send the reset code. Please try again later." });
  }
}

async function verifyPasswordResetOtp(req, res) {
  try {
    const { email, otp } = req.body || {};
    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !email.trim() ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({ message: "Please provide your email and 6-digit code." });
    }

    const challenge = await PasswordReset.findOne({
      email: email.trim().toLowerCase(),
      otpExpiresAt: { $gt: new Date() },
    });
    if (!challenge?.otpHash) {
      return res.status(400).json({ message: "The code is invalid or expired. Request a new one." });
    }
    if (challenge.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect codes. Request a new one." });
    }

    const submittedHash = Buffer.from(hashResetValue(otp), "hex");
    const storedHash = Buffer.from(challenge.otpHash, "hex");
    if (
      submittedHash.length !== storedHash.length ||
      !crypto.timingSafeEqual(submittedHash, storedHash)
    ) {
      challenge.otpAttempts += 1;
      await challenge.save();
      return res.status(400).json({ message: "The code is incorrect." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);
    challenge.otpHash = undefined;
    challenge.resetTokenHash = hashResetValue(resetToken);
    challenge.resetTokenExpiresAt = resetTokenExpiresAt;
    challenge.otpExpiresAt = resetTokenExpiresAt;
    await challenge.save();

    return res.status(200).json({ message: "Code verified.", resetToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body || {};
    if (typeof token !== "string" || typeof newPassword !== "string" || !token || !newPassword) {
      return res.status(400).json({ message: "Please provide the reset token and new password." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const filter = {
      resetTokenHash: hashResetValue(token),
      resetTokenExpiresAt: { $gt: new Date() },
    };

    // 1. Look up without consuming
    const challenge = await PasswordReset.findOne(filter);
    if (!challenge) {
      return res.status(400).json({ message: "The reset session is invalid or expired. Request a new code." });
    }

    const user = await userModel.findOne({ email: challenge.email });
    if (!user) {
      await PasswordReset.deleteOne({ _id: challenge._id });
      return res.status(404).json({ message: "The account could not be found." });
    }

    // 2. Validate before burning the token
    if (user.password && (await bcrypt.compare(newPassword, user.password))) {
      return res.status(400).json({ message: "Choose a new password different from your current one." });
    }

    // 3. Atomically consume the token (prevents double use under concurrent requests)
    const consumed = await PasswordReset.findOneAndUpdate(
      { _id: challenge._id, ...filter },
      { $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1, otpHash: 1 } },
      { returnDocument: "after" },
    );
    if (!consumed) {
      return res.status(400).json({ message: "The reset session is invalid or expired. Request a new code." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await PasswordReset.deleteOne({ _id: challenge._id });

    // 4. Optionally revoke existing sessions/refresh tokens here

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
}

async function changePassword(req, res) {
  try {
    const { email, currentPassword, newPassword } = req.body || {};
   
    if (
      typeof email !== "string" ||
      typeof currentPassword !== "string" ||  
      typeof newPassword !== "string" ||
      !email.trim() ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({ message: "Please provide all password fields." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const user = await userModel.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: "Invalid email or current password." });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: "Choose a new password different from your current one." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
  changePassword,
};
