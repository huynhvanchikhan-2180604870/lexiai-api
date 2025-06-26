const express = require("express");
const {
  addVocabulary,
  getAllVocabulary,
  getVocabularyById,
  updateVocabulary,
  deleteVocabulary,
  reviewVocabulary,
} = require("../controllers/vocabController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").post(protect, addVocabulary).get(protect, getAllVocabulary);

router
  .route("/:id")
  .get(protect, getVocabularyById)
  .put(protect, updateVocabulary)
  .delete(protect, deleteVocabulary);

router.post("/review/:id", protect, reviewVocabulary);

module.exports = router;
