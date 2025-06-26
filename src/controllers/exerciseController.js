const exerciseService = require("../services/exerciseService");
const logger = require("../utils/logger");
const { BadRequestError } = require("../utils/errorUtils");

/**
 * @desc Generate exercises for a user
 * @route GET /api/exercises/generate
 * @access Private
 * @queryParam {number} limit - Number of exercises to generate (default 5)
 */
const getGeneratedExercises = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 5;
    const exercises = await exerciseService.generateExercises(userId, limit);
    res.json(exercises);
    logger.info(
      `Generated ${exercises.length} exercises for user ${req.user.username}.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Submit answer to an exercise
 * @route POST /api/exercises/:id/submit
 * @access Private
 * @body {string} userAnswer - The user's answer (or quality score for flashcard)
 */
const submitExercise = async (req, res, next) => {
  const { userAnswer } = req.body;
  if (userAnswer === undefined || userAnswer === null) {
    return next(new BadRequestError("Câu trả lời không được để trống."));
  }
  try {
    const userId = req.user._id;
    const exerciseId = req.params.id;
    const updatedExercise = await exerciseService.submitExerciseAnswer(
      exerciseId,
      userId,
      userAnswer
    );
    res.json(updatedExercise);
    logger.info(
      `User ${req.user.username} submitted answer for exercise ${exerciseId}.`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGeneratedExercises,
  submitExercise,
};
