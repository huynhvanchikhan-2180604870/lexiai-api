const mongoose = require("mongoose");

const exerciseSchema = mongoose.Schema(
  {
    user: {
      // User who this exercise is generated for
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    vocabulary: {
      // The specific vocabulary word(s) involved in this exercise (can be multiple for matching)
      type: mongoose.Schema.Types.Mixed, // Use Mixed to allow single ObjectId or array of ObjectIds
      required: true,
      ref: "Vocabulary",
    },
    exerciseType: {
      // Type of exercise (e.g., 'flashcard', 'fill_in_blank', 'multiple_choice', 'pronunciation')
      type: String,
      required: true,
      enum: [
        "flashcard",
        "fill_in_blank",
        "multiple_choice",
        "matching",
        "scrambled_letters",
        "sentence_construction",
        "pronunciation_practice",
        "listen_choose_image",
      ],
    },
    question: {
      // The question/prompt for the exercise (can be string, array of objects, audio URL)
      type: mongoose.Schema.Types.Mixed, // Use Mixed to allow flexible types (string, array, object)
      required: true,
    },
    options: {
      // For multiple choice/matching/image: array of options
      type: mongoose.Schema.Types.Mixed, // Use Mixed to allow array of strings or array of objects
      default: [],
    },
    correctAnswer: {
      // The correct answer (string, array for matching pairs, or chosen option for image)
      type: mongoose.Schema.Types.Mixed, // Use Mixed for flexible answer types
      required: false,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    result: {
      // Store user's attempt/score/feedback (e.g., for pronunciation)
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    generatedAt: {
      // When the exercise was generated
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

exerciseSchema.index({ user: 1, generatedAt: -1 });
exerciseSchema.index({ user: 1, "vocabulary._id": 1, exerciseType: 1 }); // Index for matching type (if vocabulary is array)

const Exercise = mongoose.model("Exercise", exerciseSchema);

module.exports = Exercise;
