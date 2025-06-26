const mongoose = require("mongoose");

const vocabularySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    word: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    translation: {
      type: String,
      default: "",
    },
    wordType: {
      type: String,
      default: "N/A",
    },
    phonetic: {
      type: String,
      default: "N/A",
    },
    audioUrl: {
      type: String,
      default: "",
    },
    mouthArticulationVideoUrl: {
      type: String,
      default: "",
    },
    englishDefinition: {
      type: String,
      default: "N/A",
    },
    example: {
      type: String,
      default: "N/A",
    },
    synonyms: {
      type: [String],
      default: [],
    },
    antonyms: {
      type: [String],
      default: [],
    },
    vietnameseDefinition: {
      type: String,
      default: "N/A",
    },
    vietnameseExample: {
      type: String,
      default: "N/A",
    },
    cambridgeLink: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      // Updated enum to include N/A states for AI failures
      enum: [
        "Dễ",
        "Trung bình",
        "Khó",
        "Chưa xếp loại",
        "N/A (AI Failed)",
        "N/A (No Definition)",
      ], // <-- Added these
      default: "Chưa xếp loại",
    },
    notes: {
      type: String,
      default: "",
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    lastReviewedAt: {
      type: Date,
    },
    nextReviewAt: {
      type: Date,
    },
    easeFactor: {
      type: Number,
      default: 2.5,
    },
    repetitions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

vocabularySchema.index({ user: 1, word: 1 }, { unique: true });
vocabularySchema.index({ user: 1, addedAt: -1 });
vocabularySchema.index({ user: 1, nextReviewAt: 1 });

const Vocabulary = mongoose.model("Vocabulary", vocabularySchema);

module.exports = Vocabulary;
