const express = require("express");
const {
  getSuggestions,
  getExplanation,
} = require("../controllers/aiController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/suggest", protect, getSuggestions);
router.post("/explain", protect, getExplanation);

module.exports = router;
