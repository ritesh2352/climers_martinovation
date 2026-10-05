const mongoose = require("mongoose");
const userModel = require("../models/userModel");
const tokenBlackListModel = require("../models/tokenBlackListModel");
const { getClientInfo } = require("../utils/clientInfo");
const FailedLogin = require("../models/falidModel");
const  { sendRegistrationEmail,sendLoginNotificationEmail ,sendFailedAttemptsWarningEmail, sendAccountFrozenEmail } =require("../servise/emailServise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
    console.log(`Failed login attempts in the last 30 seconds - IP: ${ipFails}, Device: ${deviceFails}, User: ${userFails}`,
    );
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

module.exports = { registerUser, loginUser, logoutUser, getMe };
