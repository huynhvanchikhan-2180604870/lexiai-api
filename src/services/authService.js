const User = require("../models/User");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} = require("../utils/errorUtils");
const emailService = require("./emailService");
const { generateRandomString } = require("../utils/helpers");

const generateToken = (id, lastLoginTimestamp) => {
  return jwt.sign({ id, lastLoginTimestamp }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const register = async (username, email, password) => {
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    throw new BadRequestError("Email hoặc Tên người dùng đã tồn tại.");
  }

  const verificationToken = generateRandomString(32);

  const user = await User.create({
    username,
    email,
    password,
    isVerified: false,
    verificationToken,
  });

  if (user) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail(email, username, verificationLink);

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản của bạn.",
    };
  } else {
    throw new BadRequestError("Dữ liệu người dùng không hợp lệ.");
  }
};

const login = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new UnauthorizedError("Email hoặc mật khẩu không hợp lệ.");
  }

  if (!user.isVerified) {
    throw new UnauthorizedError(
      "Tài khoản của bạn chưa được xác thực. Vui lòng kiểm tra email để xác thực."
    );
  }

  if (user && (await user.matchPassword(password))) {
    user.lastLoginTimestamp = Date.now();
    await user.save();

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id, user.lastLoginTimestamp.getTime()),
    };
  } else {
    throw new UnauthorizedError("Email hoặc mật khẩu không hợp lệ.");
  }
};

const verifyEmail = async (token) => {
  const user = await User.findOne({ verificationToken: token });

  if (!user) {
    throw new NotFoundError("Token xác thực không hợp lệ hoặc đã hết hạn.");
  }
  if (user.isVerified) {
    throw new BadRequestError("Tài khoản này đã được xác thực rồi.");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.updatedAt = Date.now();
  await user.save();

  return { message: "Tài khoản của bạn đã được xác thực thành công!" };
};

module.exports = { register, login, verifyEmail };
