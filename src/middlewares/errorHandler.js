const logger = require("../utils/logger");

const notFound = (req, res, next) => {
  const error = new Error(`Không tìm thấy - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    code: statusCode, // Thêm trường mã lỗi vào phản hồi JSON
  });
  // Ghi lỗi đầy đủ vào log server (vẫn bao gồm stack) để phục vụ gỡ lỗi
  logger.error(
    `Lỗi API: ${err.message}, URL: ${req.originalUrl}, Stack: ${err.stack}`
  );
};

module.exports = { notFound, errorHandler };
