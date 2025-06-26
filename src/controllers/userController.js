const userService = require("../services/userService");
const activityLogService = require("../services/activityLogService");
const logger = require("../utils/logger");

const getUserProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user._id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    const updatedUser = await userService.updateUserProfile(req.user._id, {
      username,
      email,
      password,
    });
    await activityLogService.logActivity(
      req.user._id,
      "update_profile",
      `Người dùng ${req.user.username} đã cập nhật hồ sơ.`
    );
    res.json({
      message: "Cập nhật hồ sơ thành công",
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
    });
    logger.info(`Hồ sơ người dùng đã cập nhật: ${req.user.username}`);
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserProfile, updateUserProfile };
