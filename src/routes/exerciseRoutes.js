const express = require("express");
const {
  getGeneratedExercises,
  submitExercise,
} = require("../controllers/exerciseController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/generate", protect, getGeneratedExercises);
router.post("/:id/submit", protect, submitExercise);

module.exports = router;
