const express = require("express");
const {
  registerUser,
  authUser,
  verifyEmail,
} = require("../controllers/authController");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", authUser);
router.get("/verify-email", verifyEmail); // Route mới để xác thực email

module.exports = router;
