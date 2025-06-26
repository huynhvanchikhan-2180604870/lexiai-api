class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends CustomError {
  constructor(message = "Dữ liệu không hợp lệ.") {
    super(message, 400);
  }
}

class UnauthorizedError extends CustomError {
  constructor(message = "Không được ủy quyền.") {
    super(message, 401);
  }
}

class ForbiddenError extends CustomError {
  constructor(message = "Bạn không có quyền truy cập.") {
    super(message, 403);
  }
}

class NotFoundError extends CustomError {
  constructor(message = "Không tìm thấy tài nguyên.") {
    super(message, 404);
  }
}

class APIError extends CustomError {
  constructor(
    message = "Lỗi API bên ngoài hoặc nội bộ server.",
    statusCode = 500
  ) {
    super(message, statusCode);
  }
}

module.exports = {
  CustomError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  APIError,
};
