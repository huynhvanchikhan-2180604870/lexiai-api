const aiService = require("../services/aiService");
const userService = require("../services/userService");
const vocabService = require("../services/vocabService");
const activityLogService = require("../services/activityLogService");
const logger = require("../utils/logger");

const getSuggestions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userProfile = await userService.getUserProfile(userId);
    const learnedVocab = await vocabService.getWordsByUser(userId);

    const promptData = {
      prompt: `Bạn là một trợ lý học tiếng Anh cá nhân tên Lexi AI. Nhiệm vụ của bạn là gợi ý các từ vựng mới phù hợp nhất cho người dùng dựa trên thông tin hồ sơ và lịch sử học tập của họ.

            Thông tin người dùng:
            - ID: ${userId}
            - Trình độ tiếng Anh ước tính: ${
              userProfile.level || "Chưa xác định"
            }
            - Mục tiêu học tập: ${userProfile.goal || "Mở rộng vốn từ vựng"}
            - Lĩnh vực quan tâm: ${
              userProfile.interests && userProfile.interests.length > 0
                ? userProfile.interests.join(", ")
                : "Tổng quát"
            }
            
            Các từ vựng người dùng đã học (một số từ gần đây/quan trọng để cung cấp ngữ cảnh, tối đa 15 từ):
            ${learnedVocab
              .slice(0, 15)
              .map(
                (v) =>
                  `{"word": "${v.word}", "difficulty": "${
                    v.difficulty || "Chưa xếp loại"
                  }", "last_review": "${
                    v.lastReviewedAt
                      ? v.lastReviewedAt.toISOString().split("T")[0]
                      : "N/A"
                  }"}`
              )
              .join(",\n")}
            
            Yêu cầu: Hãy gợi ý 5 từ vựng tiếng Anh mới mà người dùng nên học tiếp theo.
            Với mỗi từ, hãy:
            1.  Cung cấp từ đó.
            2.  Định nghĩa ngắn gọn bằng tiếng Anh.
            3.  Giải thích ngắn gọn tại sao từ này phù hợp với người dùng dựa trên thông tin bạn có (tại sao nó hữu ích, liên quan đến chủ đề nào, tại sao lại là độ khó này).

            Đảm bảo các từ gợi ý là mới (chưa có trong danh sách đã học của người dùng nếu có thể).
            Trả lời dưới dạng JSON Array, mỗi object có các keys: 'word', 'definition', 'reason'.`,
    };

    const suggestionsString = await aiService.getGeminiSuggestion(promptData);
    await activityLogService.logActivity(
      userId,
      "get_suggestion",
      "Đã nhận gợi ý từ vựng từ AI."
    );

    try {
      const parsedSuggestions = JSON.parse(suggestionsString);
      res.json(parsedSuggestions);
    } catch (parseError) {
      logger.error(
        `Lỗi parse JSON từ Gemini: ${parseError.message}, Response: ${suggestionsString}`
      );
      const error = new Error("AI phản hồi không hợp lệ.");
      error.statusCode = 500;
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

const getExplanation = async (req, res, next) => {
  const { query, context } = req.body;
  try {
    const userId = req.user._id;
    const userProfile = await userService.getUserProfile(userId);
    const learnedVocabSnippet = (await vocabService.getWordsByUser(userId))
      .slice(0, 10)
      .map((v) => v.word)
      .join(", ");

    const promptData = {
      prompt: `Bạn là trợ lý học tiếng Anh cá nhân tên Lexi AI. Nhiệm vụ của bạn là giải thích, tạo ví dụ hoặc đối thoại dựa trên yêu cầu cụ thể của người dùng. Hãy luôn giải thích một cách dễ hiểu, thân thiện và cá nhân hóa.

            Thông tin người dùng:
            - Name: ${userProfile.username || "Người dùng"}
            - Trình độ tiếng Anh ước tính: ${
              userProfile.level || "Chưa xác định"
            }
            - Mục tiêu học tập: ${userProfile.goal || "Mở rộng vốn từ vựng"}
            - Các từ người dùng đã biết (để tránh lặp lại): ${
              learnedVocabSnippet || "Không có."
            }

            Yêu cầu của người dùng: "${query}"
            Ngữ cảnh thêm: "${context || "Không có."}"

            Hướng dẫn phản hồi:
            - Giải thích rõ ràng, súc tích bằng tiếng Việt.
            - Cung cấp 2-3 ví dụ đơn giản và dễ hiểu, có thể liên quan đến sở thích của người dùng nếu có thể.
            - Duy trì giọng điệu thân thiện, tích cực và dễ thương.
            - Tránh các thuật ngữ quá chuyên ngành trừ khi người dùng yêu cầu.
            `,
    };

    const explanation = await aiService.getGeminiExplanation(promptData);
    await activityLogService.logActivity(
      userId,
      "get_explanation",
      `Đã nhận giải thích từ AI cho: "${query}"`
    );
    res.json({ explanation });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSuggestions, getExplanation };
