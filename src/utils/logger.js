const winston = require("winston");

// Định nghĩa định dạng log cho console
const consoleFormat = winston.format.combine(
  winston.format.colorize(), // Thêm màu sắc cho console
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  // Định dạng tùy chỉnh để log dễ đọc hơn
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let logMessage = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length) {
      // Thêm các trường meta (như stack trace, request URL) nếu có
      // Loại bỏ các trường lỗi mặc định mà đã được xử lý bởi winston.format.errors
      const filteredMeta = Object.keys(meta).reduce((acc, key) => {
        if (key !== "stack" && key !== "err") {
          // 'err' là đối tượng lỗi gốc
          acc[key] = meta[key];
        }
        return acc;
      }, {});

      if (Object.keys(filteredMeta).length > 0) {
        // Dùng JSON.stringify có 2 khoảng trắng để format đẹp hơn
        logMessage += `\n${JSON.stringify(filteredMeta, null, 2)}`;
      }
      if (info.stack) {
        // Hiển thị stack trace riêng cho lỗi
        logMessage += `\n${info.stack}`;
      }
    }
    return logMessage;
  })
);

// Định nghĩa định dạng log cho file (vẫn là JSON để dễ parse bằng công cụ)
const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }), // Ghi stack trace cho lỗi
  winston.format.splat(), // Để xử lý các đối số bổ sung
  winston.format.json() // Định dạng JSON cho log file
);

const logger = winston.createLogger({
  level: "info", // Cấp độ log mặc định
  transports: [
    // Ghi log lỗi vào file error.log
    new winston.transports.File({
      filename: "error.log",
      level: "error",
      format: fileFormat,
    }),
    // Ghi tất cả log (info trở lên) vào file combined.log
    new winston.transports.File({
      filename: "combined.log",
      format: fileFormat,
    }),
  ],
});

// Nếu không phải môi trường sản xuất, ghi log ra console với định dạng màu sắc
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat, // Sử dụng định dạng console mới
    })
  );
}

module.exports = logger;
