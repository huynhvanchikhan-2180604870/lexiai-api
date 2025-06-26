const User = require("../models/User");
const logger = require("../utils/logger");
const { NotFoundError } = require("../utils/errorUtils");

const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new NotFoundError("Không tìm thấy người dùng.");
  }
  return user;
};

const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("Không tìm thấy người dùng.");
  }

  if (updateData.username) user.username = updateData.username;
  if (updateData.email) user.email = updateData.email;
  if (updateData.password) {
    user.password = updateData.password;
  }
  user.updatedAt = Date.now();

  await user.save();
  return user.toObject({
    getters: true,
    virtuals: false,
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    },
  });
};

module.exports = { getUserProfile, updateUserProfile };
