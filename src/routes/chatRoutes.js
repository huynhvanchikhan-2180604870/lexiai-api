const express = require("express");
const {
  createConversation,
  getConversations,
  getSingleConversation,
  deleteConversation,
  sendMessage,
} = require("../controllers/chatController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router
  .route("/")
  .post(protect, createConversation) // Create new conversation
  .get(protect, getConversations); // Get all conversations for user

router
  .route("/:id")
  .get(protect, getSingleConversation) // Get a single conversation
  .delete(protect, deleteConversation); // Delete a conversation

router.post("/:id/message", protect, sendMessage); // Send message and get AI response

module.exports = router;
