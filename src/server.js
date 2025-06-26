require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/database");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Server đang chạy trên cổng ${PORT}`);
      logger.info(`Truy cập: http://localhost:${PORT}`);
      logger.info(`ULR CLIENT: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
    logger.error(`Lỗi khi khởi động server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
