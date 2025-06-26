const dashboardService = require("../services/dashboardService");
const logger = require("../utils/logger");

/**
 * @desc Get dashboard summary for the authenticated user
 * @route GET /api/dashboard/summary
 * @access Private
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id; // User ID from authenticated request
    const summary = await dashboardService.getSummaryData(userId);
    res.json(summary);
    logger.info(`Dashboard summary fetched for user ${req.user.username}`);
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
};

module.exports = { getDashboardSummary };
