const ActivityLog = require("../models/ActivityLog");
const logger = require("../utils/logger");

const logActivity = async (
  userId,
  activityType,
  description,
  targetId = null,
  targetModel = null
) => {
  try {
    await ActivityLog.create({
      user: userId,
      activityType,
      description,
      targetId,
      targetModel,
    });
    logger.info(
      `Log hoạt động: User ${userId}, Type: ${activityType}, Desc: ${description}`
    );
  } catch (error) {
    logger.error(
      `Lỗi khi ghi nhật ký hoạt động cho user ${userId}: ${error.message}`
    );
  }
};

const getUserActivityLogs = async (userId, limit = 10, skip = 0) => {
  try {
    const logs = await ActivityLog.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    return logs;
  } catch (error) {
    logger.error(
      `Lỗi khi lấy nhật ký hoạt động cho user ${userId}: ${error.message}`
    );
    throw new Error("Không thể tải nhật ký hoạt động.");
  }
};

module.exports = {
  logActivity,
  getUserActivityLogs,
};
