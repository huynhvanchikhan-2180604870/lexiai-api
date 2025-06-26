const Conversation = require("../models/Conversation");
const aiService = require("./aiService");
const logger = require("../utils/logger");
const {
  NotFoundError,
  APIError,
  BadRequestError,
} = require("../utils/errorUtils");

/**
 * Creates a new chat conversation for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} - The newly created conversation document.
 */
const createNewConversation = async (userId) => {
  const conversation = await Conversation.create({
    user: userId,
    title: "New Chat", // Default title, can be updated later (e.g., by AI)
    messages: [],
  });
  logger.info(
    `New conversation created for user ${userId} with ID: ${conversation._id}`
  );
  return conversation;
};

/**
 * Retrieves all conversations for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array<object>>} - A list of conversation documents, sorted by last activity.
 */
const getUserConversations = async (userId) => {
  const conversations = await Conversation.find({ user: userId }).sort({
    lastActivityAt: -1,
  });
  return conversations;
};

/**
 * Retrieves a single conversation by ID for a user.
 * @param {string} conversationId - The ID of the conversation.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} - The conversation document.
 * @throws {NotFoundError} If the conversation is not found or not owned by the user.
 */
const getConversationById = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    user: userId,
  });
  if (!conversation) {
    throw new NotFoundError("Conversation not found or unauthorized access.");
  }
  return conversation;
};

/**
 * Deletes a conversation by ID for a user.
 * @param {string} conversationId - The ID of the conversation to delete.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} - The deleted conversation document.
 * @throws {NotFoundError} If the conversation is not found or not owned by the user.
 */
const deleteConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findOneAndDelete({
    _id: conversationId,
    user: userId,
  });
  if (!conversation) {
    throw new NotFoundError("Conversation not found or unauthorized access.");
  }
  logger.info(`Conversation ${conversationId} deleted by user ${userId}.`);
  return conversation;
};

/**
 * Sends a message to a conversation and gets a response from AI.
 * Updates the conversation history in the database.
 * @param {string} conversationId - The ID of the conversation.
 * @param {string} userId - The ID of the user.
 * @param {string} userMessageContent - The user's message.
 * @returns {Promise<object>} - The updated conversation with AI's response.
 * @throws {NotFoundError} If conversation not found.
 * @throws {APIError} If AI interaction fails.
 */
const sendMessageToConversation = async (
  conversationId,
  userId,
  userMessageContent
) => {
  const conversation = await getConversationById(conversationId, userId);

  // Add user's message to history
  conversation.messages.push({ role: "user", content: userMessageContent });

  // Prepare history for AI (Gemini expects [{ role: 'user/model', parts: [{ text: '...' }] }])
  // Convert our stored format { role, content } to Gemini's format { role, parts: [{ text }] }
  const geminiChatHistory = conversation.messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  let aiResponseContent;
  try {
    aiResponseContent = await aiService.getGeminiChatResponse(
      geminiChatHistory
    );
  } catch (error) {
    logger.error(
      `Failed to get AI response for conversation ${conversationId}: ${error.message}`
    );
    // Add a fallback AI error message to the conversation for the user
    aiResponseContent = `Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau. (${error.message})`;
    // You might still want to throw the error to the controller for HTTP response status
    throw new APIError(`AI chat response failed: ${error.message}`);
  }

  // Add AI's response to history
  conversation.messages.push({ role: "model", content: aiResponseContent });
  conversation.lastActivityAt = Date.now(); // Update last activity timestamp

  // Potentially generate a title for new conversations
  if (conversation.title === "New Chat" && conversation.messages.length > 2) {
    // After user asks and gets first AI response
    try {
      // Using getGeminiExplanation to generate a concise title
      const titlePrompt = `Bạn là một AI tạo tiêu đề ngắn gọn. Từ cuộc trò chuyện sau, hãy tạo một tiêu đề ngắn gọn (dưới 10 từ) bằng tiếng Việt.
Lịch sử trò chuyện:
Người dùng: ${userMessageContent}
AI: ${aiResponseContent}
Tiêu đề:`;
      const generatedTitle = await aiService.getGeminiExplanation({
        prompt: titlePrompt,
      }); // Re-using getGeminiExplanation for simplicity
      conversation.title = generatedTitle.split("\n")[0].trim(); // Only take the first line
    } catch (titleError) {
      logger.warn(
        `Failed to auto-generate conversation title for ${conversationId}: ${titleError.message}`
      );
      // Do not throw, title generation is non-critical
    }
  }

  await conversation.save();
  return conversation;
};

module.exports = {
  createNewConversation,
  getUserConversations,
  getConversationById,
  deleteConversation,
  sendMessageToConversation,
};
