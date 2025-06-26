const express = require("express");
const cors = require("cors");
const mainRoutes = require("./routes/index");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Routes
app.get("/", (req, res) => {
  res.send("API của ứng dụng học từ vựng đang hoạt động!");
});
app.use("/api", mainRoutes);

// Error handling middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
