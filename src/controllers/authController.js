const authService = require("../services/authService");
const activityLogService = require("../services/activityLogService");
const logger = require("../utils/logger");

const registerUser = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    const result = await authService.register(username, email, password);
    await activityLogService.logActivity(
      result._id,
      "register",
      `Người dùng ${username} đã đăng ký.`
    );
    res.status(201).json({ message: result.message }); // Chỉ trả về message cho người dùng
    logger.info(
      `Người dùng mới đã đăng ký (chờ xác thực): ${username} (${email})`
    );
  } catch (error) {
    next(error);
  }
};

const authUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await authService.login(email, password);
    await activityLogService.logActivity(
      user._id,
      "login",
      `Người dùng ${user.username} đã đăng nhập.`
    );
    res.json({
      message: "Đăng nhập thành công",
      _id: user._id,
      username: user.username,
      email: user.email,
      token: user.token,
    });
    logger.info(`Người dùng đã đăng nhập: ${email}`);
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  const { token } = req.query; // Lấy token từ query parameter
  try {
    const result = await authService.verifyEmail(token);
    // Có thể redirect đến một trang "xác thực thành công" trên frontend
    // res.redirect(`${process.env.FRONTEND_URL}/verification-success?message=${encodeURIComponent(result.message)}`);
    res.status(200).json(result); // Hoặc trả về JSON response
    logger.info(`Email đã được xác thực thành công với token: ${token}`);
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, authUser, verifyEmail };
