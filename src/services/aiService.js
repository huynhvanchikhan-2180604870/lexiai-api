const { GoogleGenerativeAI } = require("@google/generative-ai");
const API_KEYS = require("../config/apiKeys");
const logger = require("../utils/logger");
const { APIError } = require("../utils/errorUtils");

const genAI = new GoogleGenerativeAI(API_KEYS.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using gemini-1.5-flash model

// Helper function for artificial delay to reduce rapid API calls during development
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MIN_AI_DELAY_MS = 500; // Minimum delay between AI calls to avoid hitting rate limits too quickly

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE_MS = 1000; // 1 second base delay for retries

// Helper function to retry AI calls with exponential backoff
const retryAIFunction = async (func, ...args) => {
  let attempts = 0;
  while (attempts < MAX_RETRY_ATTEMPTS) {
    try {
      return await func(...args);
    } catch (error) {
      // Check for 429 Too Many Requests specifically
      if (
        error instanceof APIError &&
        error.message.includes("429 Too Many Requests")
      ) {
        attempts++;
        const retryDelay = RETRY_DELAY_BASE_MS * Math.pow(2, attempts - 1); // Exponential backoff
        logger.warn(
          `AI rate limit hit. Retrying in ${
            retryDelay / 1000
          }s (attempt ${attempts}/${MAX_RETRY_ATTEMPTS}).`
        );
        await delay(retryDelay);
        continue; // Try again
      }
      throw error; // Re-throw other errors immediately
    }
  }
  throw new APIError(
    `AI function failed after ${MAX_RETRY_ATTEMPTS} attempts due to rate limits.`
  );
};

/**
 * Gets vocabulary suggestions from Gemini AI.
 * @param {object} promptData - Object containing the prompt text and context.
 * @returns {Promise<string>} - JSON string response from Gemini.
 * @throws {APIError} If AI key is not configured or AI returns invalid response.
 */
const getGeminiSuggestion = async (promptData) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured. Please add it to the .env file."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const fullPrompt = promptData.prompt;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              word: { type: "STRING" },
              definition: { type: "STRING" },
              reason: { type: "STRING" },
            },
            propertyOrdering: ["word", "definition", "reason"],
          },
        },
      },
    });
    const response = await result.response;
    const text = response.text();
    return text;
  });
};

/**
 * Gets an explanation from Gemini AI.
 * @param {object} promptData - Object containing the prompt text.
 * @returns {Promise<string>} - Text response from Gemini.
 * @throws {APIError} If AI key is not configured or AI returns invalid response.
 */
const getGeminiExplanation = async (promptData) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured. Please add it to the .env file."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const fullPrompt = promptData.prompt;
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    return text;
  });
};

/**
 * Classifies word difficulty using Gemini AI.
 * @param {string} word - The English word to classify.
 * @param {string} definition - The English definition of the word.
 * @returns {Promise<string>} - Predicted difficulty: 'Dễ', 'Trung bình', 'Khó'. Throws APIError if AI fails or returns invalid classification.
 * @throws {APIError} If AI key is not configured or AI returns invalid response.
 */
const getGeminiDifficultyClassification = async (word, definition) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured, cannot use AI for difficulty classification."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const prompt = `Bạn là trợ lý đánh giá độ khó từ vựng tiếng Anh. Hãy phân loại độ khó của từ sau dựa trên định nghĩa của nó.
Từ: ${word}
Định nghĩa: ${definition}
Phân loại độ khó của từ này (chỉ trả lời bằng một trong các cấp độ): 'Dễ', 'Trung bình', 'Khó'.
Trả lời dưới dạng JSON object với khóa 'difficulty'.
Ví dụ: {"difficulty": "Dễ"}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            difficulty: {
              type: "STRING",
              enum: ["Dễ", "Trung bình", "Khó"],
            },
          },
        },
      },
    });
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);
    if (
      parsed.difficulty &&
      ["Dễ", "Trung bình", "Khó"].includes(parsed.difficulty)
    ) {
      return parsed.difficulty;
    } else {
      logger.warn(
        `Gemini returned invalid difficulty classification for "${word}": ${text}`
      );
      throw new APIError(
        `AI classification returned invalid response for "${word}".`
      );
    }
  });
};
// This file should be concatenated with Part 1 of aiService.js
// It contains the remaining functions and the module.exports statement.

/**
 * Enriches word details (example, synonyms, antonyms) from Gemini AI.
 * @param {string} word - The English word.
 * @param {string} englishDefinition - The English definition of the word.
 * @returns {Promise<object>} - Object containing example, synonyms (array), antonyms (array).
 * @throws {APIError} If AI key is not configured or AI returns invalid response.
 */
const getGeminiWordDetailsEnrichment = async (word, englishDefinition) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured, cannot use AI to enrich word details."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const prompt = `Bạn là một trợ lý ngôn ngữ. Cung cấp một ví dụ sử dụng từ "${word}", 3 từ đồng nghĩa và 3 từ trái nghĩa (nếu có) dựa trên định nghĩa sau: "${englishDefinition}".
Trả lời dưới dạng JSON object với các khóa: 'example' (tiếng Anh), 'synonyms' (mảng chuỗi tiếng Anh), 'antonyms' (mảng chuỗi tiếng Anh).
Ví dụ: {"example": "This is an example.", "synonyms": ["syn1", "syn2"], "antonyms": ["ant1", "ant2"]}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            example: { type: "STRING" },
            synonyms: { type: "ARRAY", items: { type: "STRING" } },
            antonyms: { type: "ARRAY", items: { type: "STRING" } },
          },
          propertyOrdering: ["example", "synonyms", "antonyms"],
        },
      },
    });
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);
    if (
      parsed.example === undefined ||
      parsed.synonyms === undefined ||
      parsed.antonyms === undefined
    ) {
      logger.warn(
        `Gemini trả về làm giàu từ vựng không đầy đủ cho "${word}": ${text}`
      );
      throw new APIError(
        `AI enrichment returned incomplete response for "${word}".`
      );
    }
    return {
      example: parsed.example || "N/A",
      synonyms: Array.isArray(parsed.synonyms)
        ? parsed.synonyms.slice(0, 3)
        : [],
      antonyms: Array.isArray(parsed.antonyms)
        ? parsed.antonyms.slice(0, 3)
        : [],
    };
  });
};

/**
 * Translates English text to Vietnamese using Gemini AI.
 * Prompt is adjusted to return a natural and concise translation.
 * @param {string} textToTranslate - The English text to translate.
 * @returns {Promise<string>} - The translated Vietnamese text.
 * @throws {APIError} If AI key is not configured or AI returns empty/invalid translation.
 */
const getGeminiTranslation = async (textToTranslate) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured, cannot use AI for translation."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const prompt = `Dịch văn bản tiếng Anh sau sang tiếng Việt một cách tự nhiên và cô đọng nhất. Chỉ trả về bản dịch, không thêm giải thích hay lựa chọn nào khác.
Văn bản tiếng Anh: "${textToTranslate}"
Văn bản tiếng Việt:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    if (text && text.trim()) {
      const cleanedText = text.trim();
      // Ensure no accidental string reversal logic (already handled by strict prompts)
      return cleanedText.split("\n")[0].trim();
    } else {
      logger.warn(`Gemini trả về bản dịch trống cho "${textToTranslate}".`);
      throw new APIError(
        `AI translation returned empty response for "${textToTranslate}".`
      );
    }
  });
};

/**
 * Translates a single English word to its concise Vietnamese equivalent.
 * @param {string} wordToTranslate - The English word to translate.
 * @returns {Promise<string>} - The concise Vietnamese translation.
 * @throws {APIError} If AI fails or returns invalid translation.
 */
const getGeminiConciseTranslation = async (wordToTranslate) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured, cannot use AI for concise word translation."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const prompt = `Dịch từ tiếng Anh sau đây sang từ tiếng Việt tương đương, ngắn gọn và sát nghĩa nhất. Chỉ trả lời bằng từ tiếng Việt, không giải thích.
Từ tiếng Anh: "${wordToTranslate}"
Từ tiếng Việt:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    if (text && text.trim()) {
      if (text.trim().includes("\n") || text.trim().split(" ").length > 3) {
        logger.warn(
          `Gemini trả về bản dịch cô đọng dài dòng cho "${wordToTranslate}": ${text}`
        );
        return text.trim().split("\n")[0].trim();
      }
      return text.trim();
    } else {
      logger.warn(
        `Gemini trả về bản dịch cô đọng trống cho "${wordToTranslate}".`
      );
      throw new APIError(
        `AI concise translation returned empty response for "${wordToTranslate}".`
      );
    }
  });
};

/**
 * Gets a chat response from Gemini AI.
 * @param {Array<object>} chatHistory - Conversation history for context.
 * @returns {Promise<string>} - Text response from Gemini.
 * @throws {APIError} If AI key is not configured or AI returns empty/invalid response.
 */
const getGeminiChatResponse = async (chatHistory) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured, cannot use AI chat function."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const lastUserMessage = chatHistory[chatHistory.length - 1].parts[0].text;
    const result = await chat.sendMessage(lastUserMessage);
    const response = await result.response;
    const text = response.text();

    if (text && text.trim()) {
      return text.trim();
    } else {
      logger.warn(`Gemini trả về phản hồi trò chuyện trống.`);
      throw new APIError(`AI chat returned empty response.`);
    }
  });
};

/**
 * Evaluates a user-generated sentence using Gemini AI.
 * @param {string} userAnswerSentence - The sentence written by the user.
 * @param {string} targetWord - The target vocabulary word in the sentence.
 * @param {string} targetWordDefinition - The definition of the target word.
 * @returns {Promise<{score: number, feedback: string}>} - Score (0-100) and detailed feedback.
 * @throws {APIError} If AI key is not configured or AI returns invalid response.
 */
const evaluateSentence = async (
  userAnswerSentence,
  targetWord,
  targetWordDefinition
) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured, cannot use AI to evaluate sentences."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const prompt = `Bạn là một giáo viên tiếng Anh AI. Hãy đánh giá câu sau của người dùng, tập trung vào cách họ sử dụng từ "${targetWord}" (định nghĩa: ${targetWordDefinition}).
  
  Hãy đưa ra phản hồi chi tiết về ngữ pháp, cách dùng từ, sự tự nhiên và mức độ liên quan đến từ mục tiêu. Sau đó, hãy cho một điểm từ 0 đến 100.

  Câu của người dùng: "${userAnswerSentence}"

  Trả lời dưới dạng JSON object với các khóa 'score' (number, 0-100) và 'feedback' (string).
  Ví dụ: {"score": 85, "feedback": "Câu của bạn rất tốt..."}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER" },
            feedback: { type: "STRING" },
          },
          propertyOrdering: ["score", "feedback"],
        },
      },
    });
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(text);

    if (
      typeof parsed.score === "number" &&
      typeof parsed.feedback === "string"
    ) {
      return {
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        feedback: parsed.feedback,
      };
    } else {
      logger.warn(
        `Gemini trả về đánh giá câu không hợp lệ cho "${userAnswerSentence}": ${text}`
      );
      throw new APIError(
        `AI evaluation returned invalid response for sentence.`
      );
    }
  });
};

/**
 * Evaluates pronunciation using Gemini AI (based on transcribed text from speech).
 * (NOTE: Actual pronunciation evaluation requires a specialized Speech-to-Text API with phonetic analysis capabilities).
 * @param {string} userTranscribedText - The transcribed text of the user's speech.
 * @param {string} targetWord - The target word to be pronounced.
 * @param {string} targetPhonetic - The phonetic transcription of the target word (e.g., /bæd/).
 * @returns {Promise<{score: number, feedback: string}>} - Score (0-100) and detailed feedback.
 * @throws {APIError} If AI key is not configured or AI returns invalid response.
 */
const evaluatePronunciation = async (
  userTranscribedText,
  targetWord,
  targetPhonetic
) => {
  if (!API_KEYS.GEMINI_API_KEY) {
    throw new APIError(
      "Gemini API Key is not configured, cannot use AI for pronunciation evaluation."
    );
  }
  return retryAIFunction(async () => {
    await delay(MIN_AI_DELAY_MS);
    const prompt = `Bạn là một giáo viên ngữ âm tiếng Anh AI. Người dùng đã cố gắng phát âm từ "${targetWord}" (phiên âm IPA: ${targetPhonetic}), và hệ thống đã ghi nhận lại được văn bản sau từ giọng nói của họ: "${userTranscribedText}".

  Dựa trên sự khớp giữa văn bản ghi nhận và từ/phiên âm mục tiêu, hãy đánh giá phát âm của người dùng. Hãy đưa ra phản hồi chi tiết về những điểm mạnh, điểm cần cải thiện (ví dụ: sai âm, thiếu âm cuối), và một điểm từ 0 đến 100.

  Trả lời dưới dạng JSON object với các khóa 'score' (number, 0-100) và 'feedback' (string).
  Ví dụ: {"score": 75, "feedback": "Phát âm của bạn khá tốt nhưng cần chú ý âm cuối..."}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER" },
            feedback: { type: "STRING" },
          },
          propertyOrdering: ["score", "feedback"],
        },
      },
    });
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(text);

    if (
      typeof parsed.score === "number" &&
      typeof parsed.feedback === "string"
    ) {
      return {
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        feedback: parsed.feedback,
      };
    } else {
      logger.warn(
        `Gemini trả về đánh giá phát âm không hợp lệ cho "${targetWord}": ${text}`
      );
      throw new APIError(
        `AI evaluation returned invalid response for pronunciation.`
      );
    }
  });
};

module.exports = {
  getGeminiSuggestion,
  getGeminiExplanation,
  getGeminiDifficultyClassification,
  getGeminiWordDetailsEnrichment,
  getGeminiTranslation,
  getGeminiConciseTranslation,
  getGeminiChatResponse,
  evaluateSentence,
  evaluatePronunciation,
};
