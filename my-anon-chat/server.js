const express = require("express");
const crypto = require("crypto");
const app = express();

app.use(express.json());
app.use(express.static("public")); // Serves index.html

// Store these in environment variables (.env) before pushing to Git!
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

// 1. Trigger SMS OTP via MSG91
app.post("/api/send-otp", async (req, res) => {
  const { mobile } = req.body; // Format: 919876543210

  try {
    const url = `https://msg91.com{MSG91_TEMPLATE_ID}&mobile=${mobile}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authkey: MSG91_AUTH_KEY,
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();

    if (data.type === "success") {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: data.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "SMS gateway error" });
  }
});

// 2. Verify OTP & Generate Anonymous Alias
app.post("/api/verify-otp", async (req, res) => {
  const { mobile, otp } = req.body;

  try {
    const url = `https://msg91.com{otp}&mobile=${mobile}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { authkey: MSG91_AUTH_KEY }
    });
    const data = await response.json();

    if (data.type === "success") {
      // Hash phone number with a secret salt so the same user gets a consistent alias without exposing their number
      const hash = crypto.createHash("sha256").update(mobile + "YOUR_SECRET_SALT").digest("hex");
      const alias = "User #" + parseInt(hash.substring(0, 4), 16);

      res.json({ success: true, alias });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification error" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
