const mongoose = require("mongoose");

const messageSchema = mongoose.Schema({
  role: {
    // 'user' or 'model'
    type: String,
    required: true,
    enum: ["user", "model"],
  },
  content: {
    // Message content
    type: String,
    required: true,
  },
  timestamp: {
    // Timestamp of the message
    type: Date,
    default: Date.now,
  },
});

const conversationSchema = mongoose.Schema(
  {
    user: {
      // User who owns this conversation
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    messages: {
      // Array of messages in the conversation
      type: [messageSchema],
      default: [],
    },
    title: {
      // Title of the conversation (can be AI-generated)
      type: String,
      default: "New Chat",
    },
    lastActivityAt: {
      // Timestamp of the last activity in the conversation
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Auto-add createdAt and updatedAt
  }
);

conversationSchema.index({ user: 1, lastActivityAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
