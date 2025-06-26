const User = require("../models/User");
const logger = require("../utils/logger");
const { NotFoundError } = require("../utils/errorUtils");

// Define XP thresholds for each level (example, adjust as needed)
const LEVEL_THRESHOLDS = [
  0, // Level 1: 0 XP
  100, // Level 2: 100 XP
  300, // Level 3: 300 XP
  600, // Level 4: 600 XP
  1000, // Level 5: 1000 XP
  1500, // Level 6: 1500 XP
  2500, // Level 7: 2500 XP
  4000, // Level 8: 4000 XP
  6000, // Level 9: 6000 XP
  9000, // Level 10: 9000 XP
  // Add more levels as desired
];

// Define Streak milestones and Beta rewards
const STREAK_REWARDS = [
  { days: 10, beta: 5 },
  { days: 18, beta: 10 },
  { days: 24, beta: 15 },
  { days: 33, beta: 20 },
  // Add more milestones
];

/**
 * Calculates the level based on XP.
 * @param {number} xp - Current XP of the user.
 * @returns {number} The current level.
 */
const calculateLevel = (xp) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1; // Level is index + 1
    }
  }
  return 1; // Default to level 1
};

/**
 * Calculates XP earned based on exercise quality/score.
 * @param {string} exerciseType - Type of exercise (e.g., 'flashcard', 'sentence_construction').
 * @param {number} score - The score from the exercise (e.g., 0-100 for AI score, 0-5 for SRS quality).
 * @param {number} srsQuality - The SRS quality score (0-5).
 * @returns {number} XP earned.
 */
const calculateXpEarned = (exerciseType, score, srsQuality) => {
  let xp = 0;
  const baseXP = 10; // Base XP for any completed exercise

  // XP multiplier based on quality/score
  if (score !== null && score !== undefined) {
    xp += Math.round(score / 10); // Example: 100 score -> 10 XP, 50 score -> 5 XP
  } else {
    // For flashcards where score might be based directly on srsQuality
    xp += srsQuality * 2; // Example: 5 SRS quality -> 10 XP
  }

  // Add bonus XP for certain exercise types or high quality
  if (exerciseType === "sentence_construction" && score >= 80) {
    xp += 5; // Bonus for good sentence construction
  }
  if (exerciseType === "pronunciation_practice" && score >= 80) {
    xp += 5; // Bonus for good pronunciation
  }
  if (srsQuality === 5) {
    // Perfect recall
    xp += 3;
  }

  return Math.max(1, baseXP + xp); // Ensure at least 1 XP
};

/**
 * Updates user's XP, level, and streak after completing an activity (exercise or daily check-in).
 * Awards Beta rewards for streak milestones.
 * @param {string} userId - The ID of the user.
 * @param {string} activityType - 'exercise' or 'daily_check_in'.
 * @param {number} score - The score received for the activity (e.g., 0-100 for AI score, or null for check-in).
 * @param {number} srsQuality - The SRS quality score (0-5, or null for check-in).
 * @returns {Promise<{user: object, xpEarned: number, newLevel: number, betaRewardEarned: number | null}>} The updated user document and gamification details.
 */
const updateUserProgress = async (
  userId,
  activityType,
  score = null,
  srsQuality = null
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  let xpEarned = 0;
  let betaRewardEarned = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate XP based on activity type
  if (activityType === "exercise") {
    xpEarned = calculateXpEarned(activityType, score, srsQuality);
  } else if (activityType === "daily_check_in") {
    xpEarned = 10; // Base XP for check-in
  }

  user.xp += xpEarned;

  const oldLevel = user.level;
  const newLevel = calculateLevel(user.xp);
  if (newLevel > oldLevel) {
    user.level = newLevel;
    logger.info(`User ${user.username} leveled up to Level ${newLevel}!`);
    // TODO: Trigger a notification for the user about leveling up
  }

  // Streak calculation and rewards
  const lastActivity = user.lastActivityDate
    ? new Date(user.lastActivityDate)
    : null;
  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  if (!lastActivity || lastActivity.getTime() < yesterday.getTime()) {
    // If last activity was before yesterday or never, reset streak
    user.streak = 1;
    logger.info(`User ${user.username} started a new streak!`);
  } else if (lastActivity.getTime() === yesterday.getTime()) {
    // If last activity was yesterday, increment streak
    user.streak++;
    logger.info(
      `User ${user.username} continued streak to ${user.streak} days!`
    );
  } else if (lastActivity.getTime() === today.getTime()) {
    // If already active today, streak doesn't change for this activity
    // This is important: ensure streak is only incremented ONCE per day
    // For check-in, the check in service already prevents double check-ins.
    // For exercises, multiple exercises in one day don't extend streak beyond 1 for that day.
    logger.info(
      `User ${user.username} already active today. Streak remains ${user.streak}.`
    );
  }

  user.lastActivityDate = today; // Update last activity to today

  // Check for streak rewards
  const matchingReward = STREAK_REWARDS.find((r) => r.days === user.streak);
  if (matchingReward) {
    user.betaRewards += matchingReward.beta;
    betaRewardEarned = matchingReward.beta;
    logger.info(
      `User ${user.username} reached ${user.streak} days streak and earned ${matchingReward.beta} Beta!`
    );
    // TODO: Trigger a notification for earning Beta
  }

  await user.save();

  return {
    user: user.toObject({
      getters: true,
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    }),
    xpEarned,
    newLevel: user.level,
    betaRewardEarned,
  };
};

module.exports = {
  updateUserProgress,
  calculateLevel,
  LEVEL_THRESHOLDS,
  STREAK_REWARDS, // Export rewards for frontend to display upcoming rewards
};
