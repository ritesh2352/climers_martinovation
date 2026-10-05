const geoip = require("geoip-lite"); 

function getClientInfo(req) {
  const demo = process.env.DEMO_MODE === "true";

  let ip = (req.ip || req.socket.remoteAddress || "").replace("::ffff:", "");
  if (demo && req.headers["x-fake-ip"]) ip = req.headers["x-fake-ip"];

  let country = geoip.lookup(ip)?.country || "UNKNOWN";
  if (demo && req.headers["x-fake-country"]) country = req.headers["x-fake-country"];

  let device = req.headers["user-agent"] || "unknown";
  if (demo && req.headers["x-fake-device"]) device = req.headers["x-fake-device"];

  return { ip, country, device };
}

module.exports = { getClientInfo };