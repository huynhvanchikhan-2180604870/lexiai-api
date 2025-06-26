const Vocabulary = require("../models/Vocabulary");
const logger = require("../utils/logger");
const { NotFoundError } = require("../utils/errorUtils");

const calculateSM2 = (quality, repetitions, easeFactor, lastReviewedAt) => {
  let newEaseFactor = easeFactor;
  let newRepetitions = repetitions;
  let nextInterval;

  if (quality >= 3) {
    if (quality === 3) newEaseFactor = Math.max(1.3, easeFactor - 0.15);
    else if (quality === 4) newEaseFactor = easeFactor;
    else if (quality === 5) newEaseFactor = easeFactor + 0.1;

    newRepetitions++;

    if (newRepetitions === 1) {
      nextInterval = 1;
    } else if (newRepetitions === 2) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(repetitions * newEaseFactor);
    }
  } else {
    newRepetitions = 0;
    nextInterval = 1;
    newEaseFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const nextReviewAt = new Date(lastReviewedAt || Date.now());
  nextReviewAt.setDate(nextReviewAt.getDate() + nextInterval);

  return {
    nextReviewAt,
    newRepetitions,
    newEaseFactor,
  };
};

const updateSrsData = async (wordId, userId, quality) => {
  const vocab = await Vocabulary.findOne({ _id: wordId, user: userId });
  if (!vocab) {
    throw new NotFoundError(
      "Không tìm thấy từ vựng hoặc bạn không có quyền truy cập."
    );
  }

  const { nextReviewAt, newRepetitions, newEaseFactor } = calculateSM2(
    quality,
    vocab.repetitions,
    vocab.easeFactor,
    vocab.lastReviewedAt || vocab.addedAt
  );

  vocab.lastReviewedAt = Date.now();
  vocab.nextReviewAt = nextReviewAt;
  vocab.repetitions = newRepetitions;
  vocab.easeFactor = newEaseFactor;
  vocab.updatedAt = Date.now();

  await vocab.save();
  logger.info(
    `SRS Data cập nhật cho từ "${
      vocab.word
    }": Next Review: ${nextReviewAt.toLocaleDateString()}, Reps: ${newRepetitions}, EF: ${newEaseFactor.toFixed(
      2
    )}`
  );
  return vocab;
};

const getWordsForReview = async (userId) => {
  const now = new Date();
  const vocabularies = await Vocabulary.find({
    user: userId,
    nextReviewAt: { $lte: now },
  }).sort({ nextReviewAt: 1 });
  return vocabularies;
};

module.exports = {
  updateSrsData,
  getWordsForReview,
};
