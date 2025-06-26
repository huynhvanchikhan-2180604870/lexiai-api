const checkInService = require("../services/checkInService");
const logger = require("../utils/logger");

/**
 * @desc Handle daily check-in for the user
 * @route POST /api/check-in/daily
 * @access Private
 */
const performDailyCheckIn = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await checkInService.dailyCheckIn(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Check if user has already checked in today
 * @route GET /api/check-in/status
 * @access Private
 */
const getDailyCheckInStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const status = await checkInService.hasCheckedInToday(userId);
    res.json({ checkedInToday: status });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  performDailyCheckIn,
  getDailyCheckInStatus,
};
