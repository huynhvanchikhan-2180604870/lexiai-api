const vocabService = require("../services/vocabService");
const activityLogService = require("../services/activityLogService");
const srsService = require("../services/srsService");
const logger = require("../utils/logger");

const addVocabulary = async (req, res, next) => {
  const { word } = req.body;
  try {
    const userId = req.user._id;
    const newVocab = await vocabService.addWord(userId, word);
    await activityLogService.logActivity(
      userId,
      "add_word",
      `Đã thêm từ vựng: ${word}`,
      newVocab._id,
      "Vocabulary"
    );
    res.status(201).json(newVocab);
    logger.info(`Người dùng ${req.user.username} đã thêm từ: ${word}`);
  } catch (error) {
    next(error);
  }
};

const getAllVocabulary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const vocabularies = await vocabService.getWordsByUser(userId);
    res.json(vocabularies);
  } catch (error) {
    next(error);
  }
};

const getVocabularyById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const vocab = await vocabService.getWordById(req.params.id, userId);
    res.json(vocab);
  } catch (error) {
    next(error);
  }
};

const updateVocabulary = async (req, res, next) => {
  const {
    word,
    wordType,
    phonetic,
    audioUrl,
    mouthArticulationVideoUrl,
    englishDefinition,
    example,
    synonyms,
    antonyms,
    vietnameseDefinition,
    vietnameseExample,
    cambridgeLink,
    difficulty,
    notes,
  } = req.body;
  try {
    const userId = req.user._id;
    const updatedVocab = await vocabService.updateWord(req.params.id, userId, {
      word,
      wordType,
      phonetic,
      audioUrl,
      mouthArticulationVideoUrl,
      englishDefinition,
      example,
      synonyms,
      antonyms,
      vietnameseDefinition,
      vietnameseExample,
      cambridgeLink,
      difficulty,
      notes,
    });
    await activityLogService.logActivity(
      userId,
      "update_word",
      `Đã cập nhật từ vựng: ${word || updatedVocab.word}`,
      updatedVocab._id,
      "Vocabulary"
    );
    res.json(updatedVocab);
    logger.info(
      `Người dùng ${req.user.username} đã cập nhật từ: ${
        word || updatedVocab.word
      }`
    );
  } catch (error) {
    next(error);
  }
};

const deleteVocabulary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const deletedVocab = await vocabService.deleteWord(req.params.id, userId);
    await activityLogService.logActivity(
      userId,
      "delete_word",
      `Đã xóa từ vựng: ${deletedVocab.word}`,
      deletedVocab._id,
      "Vocabulary"
    );
    res.json({ message: "Từ vựng đã được xóa" });
    logger.info(
      `Người dùng ${req.user.username} đã xóa từ: ${deletedVocab.word}`
    );
  } catch (error) {
    next(error);
  }
};

const reviewVocabulary = async (req, res, next) => {
  const { quality } = req.body;
  try {
    const userId = req.user._id;
    const updatedVocab = await srsService.updateSrsData(
      req.params.id,
      userId,
      quality
    );
    await activityLogService.logActivity(
      userId,
      "review_word",
      `Đã ôn tập từ vựng: ${updatedVocab.word} (Chất lượng: ${quality})`,
      updatedVocab._id,
      "Vocabulary"
    );
    res.json(updatedVocab);
    logger.info(
      `Người dùng ${req.user.username} đã ôn tập từ: ${updatedVocab.word} với chất lượng ${quality}`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addVocabulary,
  getAllVocabulary,
  getVocabularyById,
  updateVocabulary,
  deleteVocabulary,
  reviewVocabulary,
};
