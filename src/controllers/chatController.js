const chatService = require("../services/chatService");
const activityLogService = require("../services/activityLogService");
const logger = require("../utils/logger");
const { NotFoundError, BadRequestError } = require("../utils/errorUtils");

/**
 * @desc Create a new chat conversation
 * @route POST /api/chat
 * @access Private
 */
const createConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const newConversation = await chatService.createNewConversation(userId);
    await activityLogService.logActivity(
      userId,
      "create_chat",
      `Người dùng đã tạo cuộc trò chuyện mới: ${newConversation.title}`,
      newConversation._id,
      "Conversation"
    );
    res.status(201).json(newConversation);
    logger.info(`Người dùng ${req.user.username} đã tạo cuộc trò chuyện mới.`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all conversations for a user
 * @route GET /api/chat
 * @access Private
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await chatService.getUserConversations(userId);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get a single conversation by ID
 * @route GET /api/chat/:id
 * @access Private
 */
const getSingleConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversation = await chatService.getConversationById(
      req.params.id,
      userId
    );
    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete a conversation
 * @route DELETE /api/chat/:id
 * @access Private
 */
const deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await chatService.deleteConversation(req.params.id, userId);
    await activityLogService.logActivity(
      userId,
      "delete_chat",
      `Người dùng đã xóa cuộc trò chuyện: ${req.params.id}`,
      req.params.id,
      "Conversation"
    );
    res.status(204).json({ message: "Conversation deleted successfully" }); // 204 No Content
    logger.info(
      `Người dùng ${req.user.username} đã xóa cuộc trò chuyện ${req.params.id}.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Send a message to AI and get response
 * @route POST /api/chat/:id/message
 * @access Private
 */
const sendMessage = async (req, res, next) => {
  const { message } = req.body;
  if (!message || message.trim() === "") {
    return next(new BadRequestError("Tin nhắn không được để trống."));
  }
  try {
    const userId = req.user._id;
    const conversationId = req.params.id;
    const updatedConversation = await chatService.sendMessageToConversation(
      conversationId,
      userId,
      message
    );
    await activityLogService.logActivity(
      userId,
      "send_chat_message",
      `Người dùng gửi tin nhắn: "${message}" trong cuộc trò chuyện ${conversationId}`,
      conversationId,
      "Conversation"
    );

    // Return only the newly added AI message, or the updated conversation
    // For simplicity, returning the whole updated conversation for now
    res.json(updatedConversation);
    logger.info(
      `Người dùng ${req.user.username} gửi tin nhắn đến cuộc trò chuyện ${conversationId}.`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConversation,
  getConversations,
  getSingleConversation,
  deleteConversation,
  sendMessage,
};
