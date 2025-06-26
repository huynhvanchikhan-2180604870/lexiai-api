const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const { UnauthorizedError, ForbiddenError } = require("../utils/errorUtils");

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        throw new UnauthorizedError("Không tìm thấy người dùng cho token này.");
      }

      // Logic kiểm tra phiên đăng nhập duy nhất
      // So sánh timestamp trong token với timestamp trong database
      // Chuyển cả hai sang dạng số để so sánh chính xác
      if (
        decoded.lastLoginTimestamp !== req.user.lastLoginTimestamp.getTime()
      ) {
        logger.warn(
          `Phiên cũ bị vô hiệu hóa cho người dùng ${req.user.username}.`
        );
        throw new UnauthorizedError(
          "Phiên của bạn đã bị đăng xuất do đăng nhập từ một thiết bị khác."
        );
      }

      next();
    } catch (error) {
      logger.error(`Lỗi xác thực token: ${error.message}`);
      // Đảm bảo trả về lỗi Unauthorized nếu token không hợp lệ hoặc hết hạn
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError" ||
        error instanceof UnauthorizedError
      ) {
        next(new UnauthorizedError(error.message));
      } else {
        next(error); // Chuyển lỗi khác (nếu có)
      }
    }
  }
  if (!token) {
    throw new UnauthorizedError("Không được ủy quyền, không có token.");
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new ForbiddenError(
        `Người dùng với quyền ${
          req.user ? req.user.role : "không xác định"
        } không được phép truy cập tài nguyên này.`
      );
      next(error);
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
