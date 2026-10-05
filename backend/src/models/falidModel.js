const mongoose = require("mongoose");
const failedSchema = new mongoose.Schema(
  {
    ip: String,
    device: String,
    email: String,
    createdAt: { type: Date, default: Date.now, expires: 300 }, // Document expires after 5 minutes
  },
  { autoIndex: false },
);
const FailedLogin = mongoose.model("FailedLogin", failedSchema);

module.exports = FailedLogin;