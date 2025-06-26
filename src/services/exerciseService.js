const Exercise = require("../models/Exercise");
const Vocabulary = require("../models/Vocabulary");
const activityLogService = require("./activityLogService");
const aiService = require("./aiService");
const srsService = require("./srsService");
const gamificationService = require("./gamificationService");
const logger = require("../utils/logger");
const {
  NotFoundError,
  BadRequestError,
  APIError,
} = require("../utils/errorUtils");

/**
 * Generates a set of exercises for a user based on their vocabulary.
 * Focuses on words due for review (from SRS) or recently added.
 * @param {string} userId - The ID of the user.
 * @param {number} limit - Max number of exercises to generate.
 * @returns {Promise<Array<object>>} - Array of generated exercise documents.
 */
const generateExercises = async (userId, limit = 5) => {
  logger.info(`Generating ${limit} exercises for user ${userId}...`);
  let wordsForExercise = await srsService.getWordsForReview(userId);

  if (wordsForExercise.length < limit) {
    const recentWords = await Vocabulary.find({
      user: userId,
      _id: { $nin: wordsForExercise.map((w) => w._id) },
    })
      .sort({ addedAt: -1 })
      .limit(limit - wordsForExercise.length);
    wordsForExercise = [...wordsForExercise, ...recentWords];
  }

  if (wordsForExercise.length === 0) {
    logger.info(`No words available for exercises for user ${userId}.`);
    return [];
  }

  const exercises = [];
  wordsForExercise = wordsForExercise.sort(() => 0.5 - Math.random());

  for (let i = 0; i < Math.min(limit, wordsForExercise.length); i++) {
    const wordDoc = wordsForExercise[i];
    const availableExerciseTypes = [
      "flashcard",
      "multiple_choice",
      "fill_in_blank",
      "sentence_construction",
      "pronunciation_practice",
      "matching",
      "listen_choose_image",
    ];
    const randomType =
      availableExerciseTypes[
        Math.floor(Math.random() * availableExerciseTypes.length)
      ];

    let newExercise = null;

    try {
      logger.info(
        `Attempting to generate ${randomType} exercise for word "${wordDoc.word}"`
      );
      switch (randomType) {
        case "flashcard":
          newExercise = await Exercise.create({
            user: userId,
            vocabulary: wordDoc._id,
            exerciseType: "flashcard",
            question: wordDoc.word, // The word itself is the question
            correctAnswer: wordDoc.vietnameseDefinition, // The Vietnamese definition is the answer
          });
          break;
        case "multiple_choice":
          let options = [wordDoc.vietnameseDefinition];
          if (
            wordDoc.englishDefinition &&
            wordDoc.englishDefinition !== "N/A" &&
            wordDoc.englishDefinition !== "No definition found for this word."
          ) {
            try {
              const aiDistractorPrompt = `For the English word "${wordDoc.word}" with definition "${wordDoc.englishDefinition}", provide 3 plausible but incorrect Vietnamese definitions that could be mistaken for it in a multiple choice question. Return as a JSON array of strings. Example: ["distractor_def1", "distractor_def2", "distractor_def3"]`;
              const aiResponse = await aiService.getGeminiExplanation({
                prompt: aiDistractorPrompt,
              });
              const parsedDistractors = JSON.parse(aiResponse);
              if (
                Array.isArray(parsedDistractors) &&
                parsedDistractors.every((d) => typeof d === "string")
              ) {
                options.push(...parsedDistractors.slice(0, 3));
              }
            } catch (aiError) {
              logger.warn(
                `AI failed to generate distractors for "${wordDoc.word}": ${aiError.message}. Using basic distractors.`
              );
              options.push(
                `Nghĩa sai 1 (từ AI)`,
                `Nghĩa sai 2 (từ AI)`,
                `Nghĩa sai 3 (từ AI)`
              );
            }
          } else {
            options.push(
              `Nghĩa sai 1 (mặc định)`,
              `Nghĩa sai 2 (mặc định)`,
              `Nghĩa sai 3 (mặc định)`
            );
          }

          options = options.sort(() => 0.5 - Math.random());

          newExercise = await Exercise.create({
            user: userId,
            vocabulary: wordDoc._id,
            exerciseType: "multiple_choice",
            question: `Chọn nghĩa tiếng Việt đúng của từ "${wordDoc.word}":`,
            options: options,
            correctAnswer: wordDoc.vietnameseDefinition,
          });
          break;
        case "fill_in_blank":
          if (
            wordDoc.example &&
            wordDoc.example !== "N/A" &&
            wordDoc.example !== "N/A (AI Failed)"
          ) {
            const blankedExample = wordDoc.example.replace(
              new RegExp(`\\b${wordDoc.word}\\b`, "gi"),
              "____"
            );
            newExercise = await Exercise.create({
              user: userId,
              vocabulary: wordDoc._id,
              exerciseType: "fill_in_blank",
              question: blankedExample,
              correctAnswer: wordDoc.word,
            });
          } else {
            logger.warn(
              `Skipping fill_in_blank for "${wordDoc.word}" due to missing example or AI failure.`
            );
          }
          break;
        case "sentence_construction":
          newExercise = await Exercise.create({
            user: userId,
            vocabulary: wordDoc._id,
            exerciseType: "sentence_construction",
            question: `Viết một câu tiếng Anh sử dụng từ "${
              wordDoc.word
            }" (định nghĩa: ${wordDoc.englishDefinition || "N/A"}).`,
            correctAnswer: null, // AI will evaluate, no single correct answer
          });
          break;
        case "pronunciation_practice":
          newExercise = await Exercise.create({
            user: userId,
            vocabulary: wordDoc._id,
            exerciseType: "pronunciation_practice",
            question: `Hãy phát âm từ "${wordDoc.word}" (phiên âm: ${
              wordDoc.phonetic || "N/A"
            }).`,
            correctAnswer: null, // AI will evaluate, user provides audio/text
          });
          break;
        case "matching":
          const wordsForMatching = [
            wordDoc,
            ...wordsForExercise
              .filter((w) => w._id.toString() !== wordDoc._id.toString())
              .slice(0, 2),
          ];
          if (wordsForMatching.length < 2) {
            logger.warn(
              `Skipping matching exercise for "${wordDoc.word}" due to insufficient words.`
            );
            break;
          }
          // For matching, the 'question' is an array of objects for the left column
          // The 'options' is an array of objects for the right column
          // 'correctAnswer' is a JSON string mapping left_id to correct_right_text

          const questionPairs = wordsForMatching.map((w) => ({
            id: w._id.toString(),
            text: w.word,
          }));
          const answerPairs = wordsForMatching.map((w) => ({
            id: w._id.toString(),
            text: w.vietnameseDefinition || w.englishDefinition,
          }));

          const shuffledAnswerOptions = answerPairs.sort(
            () => 0.5 - Math.random()
          );

          const correctAnswerMapping = wordsForMatching.reduce((acc, w) => {
            acc[w._id.toString()] =
              w.vietnameseDefinition || w.englishDefinition;
            return acc;
          }, {});

          newExercise = await Exercise.create({
            user: userId,
            vocabulary: wordsForMatching.map((w) => w._id), // Store multiple vocabulary IDs for context
            exerciseType: "matching",
            question: questionPairs, // Left column: words
            options: shuffledAnswerOptions, // Right column: definitions
            correctAnswer: JSON.stringify(correctAnswerMapping), // Store correct mapping as JSON string
          });
          break;
        case "listen_choose_image":
          if (!wordDoc.audioUrl || wordDoc.audioUrl === "N/A") {
            logger.warn(
              `Skipping listen_choose_image for "${wordDoc.word}" due to missing audio URL.`
            );
            break;
          }

          let imageOptions = [];
          try {
            const imageConceptPrompt = `For the English word "${wordDoc.word}", provide 3 plausible but incorrect image concepts (e.g., descriptions of objects or scenes) that could be used as distractors for a "listen and choose image" question. The descriptions should be short and direct. Return as a JSON array of strings. Example: ["concept1", "concept2", "concept3"]`;
            const aiResponse = await aiService.getGeminiExplanation({
              prompt: imageConceptPrompt,
            });
            const parsedConcepts = JSON.parse(aiResponse);
            if (
              Array.isArray(parsedConcepts) &&
              parsedConcepts.every((c) => typeof c === "string")
            ) {
              imageOptions.push(...parsedConcepts.slice(0, 3));
            }
          } catch (aiError) {
            logger.warn(
              `AI failed to generate image distractors for "${wordDoc.word}": ${aiError.message}. Using default image concepts.`
            );
            imageOptions.push(
              `a related but incorrect image`,
              `another incorrect image`,
              `a third incorrect image`
            );
          }

          const correctImageConcept = `Image for ${wordDoc.word} (${
            wordDoc.translation ||
            wordDoc.vietnameseDefinition ||
            wordDoc.englishDefinition
          })`;
          imageOptions.unshift(correctImageConcept);
          imageOptions = imageOptions
            .map((concept) => ({
              concept: concept,
              imageUrl: `https://placehold.co/150x150/${Math.floor(
                Math.random() * 16777215
              ).toString(16)}/ffffff?text=${encodeURIComponent(
                concept.substring(0, Math.min(concept.length, 10))
              )}`,
            }))
            .sort(() => 0.5 - Math.random());

          newExercise = await Exercise.create({
            user: userId,
            vocabulary: wordDoc._id,
            exerciseType: "listen_choose_image",
            question: wordDoc.audioUrl, // Audio URL is the question
            options: imageOptions, // Array of {concept, imageUrl}
            correctAnswer: correctImageConcept, // The concept string that represents the correct image
          });
          break;
        default:
          logger.warn(
            `Unsupported exercise type: ${randomType} for word "${wordDoc.word}".`
          );
          break;
      }
    } catch (error) {
      logger.error(
        `Error generating exercise of type "${randomType}" for "${wordDoc.word}": ${error.message}`
      );
    }

    if (newExercise) {
      exercises.push(newExercise);
      logger.info(
        `Generated exercise ${newExercise._id} for word "${wordDoc.word}". Type: ${newExercise.exerciseType}.`
      );
      await activityLogService.logActivity(
        userId,
        "generate_exercise",
        `Generated exercise type "${newExercise.exerciseType}" for word "${wordDoc.word}"`,
        newExercise._id,
        "Exercise"
      );
    }
  }
  logger.info(
    `Finished generating exercises for user ${userId}. Total: ${exercises.length}.`
  );
  return exercises;
};

/**
 * Submits the user's answer to an exercise and evaluates it.
 * Updates the exercise status and SRS data for the vocabulary word.
 * Also updates user's XP, level, and streak.
 * @param {string} exerciseId - The ID of the exercise.
 * @param {string} userId - The ID of the user.
 * @param {string} userAnswer - The user's provided answer (can be text, a quality score for flashcards).
 * @returns {Promise<object>} - The updated exercise document with evaluation results, and XP/streak data.
 * @throws {NotFoundError} If exercise not found.
 * @throws {BadRequestError} If exercise already completed or invalid answer.
 */
const submitExerciseAnswer = async (exerciseId, userId, userAnswer) => {
  logger.info(
    `Submitting answer for exercise ${exerciseId} by user ${userId}. Answer: "${userAnswer}"`
  );
  const exercise = await Exercise.findOne({
    _id: exerciseId,
    user: userId,
  }).populate("vocabulary");
  if (!exercise) {
    throw new NotFoundError("Exercise not found or unauthorized access.");
  }
  if (exercise.isCompleted) {
    throw new BadRequestError("This exercise has already been completed.");
  }

  let isCorrect = false;
  let feedback = "No specific feedback provided.";
  let srsQuality = 0; // 0-5 for SRS algorithm
  let aiScore = null; // AI-generated score (0-100)

  try {
    switch (exercise.exerciseType) {
      case "flashcard":
        srsQuality = parseInt(userAnswer);
        if (isNaN(srsQuality) || srsQuality < 0 || srsQuality > 5) {
          throw new BadRequestError("Invalid quality score (must be 0-5).");
        }
        isCorrect = srsQuality >= 3;
        feedback = `Bạn đã đánh giá mức độ ghi nhớ: ${srsQuality}/5.`;
        aiScore = srsQuality * 20;
        break;

      case "multiple_choice":
      case "fill_in_blank":
        isCorrect =
          userAnswer.toLowerCase().trim() ===
          exercise.correctAnswer.toLowerCase().trim();
        srsQuality = isCorrect ? 5 : 0;
        feedback = isCorrect
          ? "Chính xác! 👍"
          : `Sai rồi. Đáp án đúng là: "${exercise.correctAnswer}" 👎`;
        aiScore = isCorrect ? 100 : 0;
        break;

      case "sentence_construction":
        if (
          !userAnswer ||
          typeof userAnswer !== "string" ||
          userAnswer.trim().length < 5
        ) {
          throw new BadRequestError("Vui lòng viết một câu đầy đủ.");
        }
        const sentenceEvaluation = await aiService.evaluateSentence(
          userAnswer,
          exercise.vocabulary.word,
          exercise.vocabulary.englishDefinition
        );
        aiScore = sentenceEvaluation.score;
        feedback = sentenceEvaluation.feedback;
        srsQuality = Math.round(aiScore / 20);
        isCorrect = aiScore >= 60;
        break;

      case "pronunciation_practice":
        if (
          !userAnswer ||
          typeof userAnswer !== "string" ||
          userAnswer.trim() === ""
        ) {
          throw new BadRequestError(
            "Vui lòng cung cấp văn bản của phát âm đã ghi âm."
          );
        }
        const pronunciationEvaluation = await aiService.evaluatePronunciation(
          userAnswer,
          exercise.vocabulary.word,
          exercise.vocabulary.phonetic
        );
        aiScore = pronunciationEvaluation.score;
        feedback = pronunciationEvaluation.feedback;
        srsQuality = Math.round(aiScore / 20);
        isCorrect = aiScore >= 60;
        break;

      case "matching":
        const userMatches = JSON.parse(userAnswer); // Expected { "questionId1": "userAnswerText1", ... }
        const correctMatches = JSON.parse(exercise.correctAnswer); // Expected { "questionId1": "correctAnswerText1", ... }
        let correctCount = 0;
        const totalPairs = Object.keys(correctMatches).length;

        for (const qId in correctMatches) {
          if (
            userMatches[qId] &&
            userMatches[qId].toLowerCase().trim() ===
              correctMatches[qId].toLowerCase().trim()
          ) {
            correctCount++;
          }
        }
        isCorrect = correctCount === totalPairs;
        srsQuality = Math.round((correctCount / totalPairs) * 5);
        aiScore = Math.round((correctCount / totalPairs) * 100);
        feedback = isCorrect
          ? `Tuyệt vời! Bạn đã ghép đúng ${correctCount}/${totalPairs} cặp.`
          : `Bạn đã ghép đúng ${correctCount}/${totalPairs} cặp. Vui lòng xem lại các cặp sai.`;
        break;

      case "listen_choose_image":
        isCorrect = userAnswer === exercise.correctAnswer;
        srsQuality = isCorrect ? 5 : 0;
        feedback = isCorrect
          ? "Chính xác! 👍"
          : `Sai rồi. Đáp án đúng là: "${exercise.correctAnswer}" 👎`;
        aiScore = isCorrect ? 100 : 0;
        break;

      default:
        throw new BadRequestError(
          `Unsupported exercise type for evaluation: ${exercise.exerciseType}`
        );
    }
  } catch (error) {
    logger.error(
      `Error evaluating exercise of type "${exercise.exerciseType}" for word "${
        exercise.vocabulary?.word || "N/A"
      }": ${error.message}`
    );
    feedback = `Đã xảy ra lỗi khi chấm điểm bài tập: ${error.message}. Vui lòng thử lại.`;
    isCorrect = false;
    srsQuality = 0;
    aiScore = 0;
    if (error instanceof APIError) throw error;
  }

  exercise.isCompleted = true;
  exercise.result = {
    userAnswer: userAnswer,
    isCorrect: isCorrect,
    feedback: feedback,
    score: aiScore,
  };
  await exercise.save();

  const primaryVocabId = Array.isArray(exercise.vocabulary)
    ? exercise.vocabulary[0]
    : exercise.vocabulary;
  if (primaryVocabId) {
    await srsService.updateSrsData(primaryVocabId._id, userId, srsQuality);
  }

  const {
    user: updatedUser,
    xpEarned,
    newLevel,
    betaRewardEarned,
  } = await gamificationService.updateUserProgress(
    userId,
    "exercise",
    aiScore,
    srsQuality
  );
  await activityLogService.logActivity(
    userId,
    "complete_exercise",
    `Completed exercise "${exercise.exerciseType}" for word "${
      exercise.vocabulary?.word || "N/A"
    }" (Score: ${aiScore || "N/A"})`,
    exercise._id,
    "Exercise"
  );

  logger.info(
    `Exercise ${exerciseId} completed. User XP: ${updatedUser.xp}, Level: ${updatedUser.level}, Streak: ${updatedUser.streak}.`
  );

  return { exercise, updatedUser, xpEarned, newLevel, betaRewardEarned };
};

module.exports = {
  generateExercises,
  submitExerciseAnswer,
};
