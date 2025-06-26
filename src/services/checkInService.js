const User = require("../models/User");
const gamificationService = require("./gamificationService"); // To give XP for check-in
const activityLogService = require("./activityLogService");
const logger = require("../utils/logger");
const { BadRequestError, NotFoundError } = require("../utils/errorUtils");

/**
 * Handles the daily check-in process for a user.
 * Awards 'beta' reward and potentially XP.
 * @param {string} userId - The ID of the user checking in.
 * @returns {Promise<object>} - Updated user object and check-in status.
 */
const dailyCheckIn = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const lastCheckIn = user.lastCheckInDate
    ? new Date(user.lastCheckInDate)
    : null;
  if (lastCheckIn) {
    lastCheckIn.setHours(0, 0, 0, 0);
  }

  if (lastCheckIn && lastCheckIn.getTime() === today.getTime()) {
    throw new BadRequestError("Bạn đã điểm danh ngày hôm nay rồi.");
  }

  // Grant 1 'beta' reward
  user.betaRewards = (user.betaRewards || 0) + 1;
  user.lastCheckInDate = today;

  // Optional: Grant some XP for daily check-in
  const xpForCheckIn = 10; // Example XP for check-in
  user.xp += xpForCheckIn;
  user.level = gamificationService.calculateLevel(user.xp); // Recalculate level

  await user.save();

  await activityLogService.logActivity(
    user._id,
    "daily_check_in",
    `Người dùng đã điểm danh hàng ngày và nhận 1 Beta.`,
    null,
    null,
    { xpGained: xpForCheckIn, betaGained: 1 }
  );
  logger.info(
    `User ${user.username} checked in daily. Gained 1 Beta and ${xpForCheckIn} XP.`
  );

  return {
    user: user.toObject({
      getters: true,
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    }),
    message: "Điểm danh thành công! Bạn đã nhận được 1 Beta!",
    xpGained: xpForCheckIn,
    betaGained: 1,
  };
};

const hasCheckedInToday = async (userId) => {
  const user = await User.findById(userId).select("lastCheckInDate");
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastCheckIn = user.lastCheckInDate
    ? new Date(user.lastCheckInDate)
    : null;
  if (lastCheckIn) {
    lastCheckIn.setHours(0, 0, 0, 0);
  }

  return lastCheckIn && lastCheckIn.getTime() === today.getTime();
};

module.exports = {
  dailyCheckIn,
  hasCheckedInToday,
};
