const axios = require("axios");
const logger = require("../utils/logger");
const API_KEYS = require("../config/apiKeys");
const { APIError, NotFoundError } = require("../utils/errorUtils");

const simulateVietnameseTranslation = (text) => {
  return `[TV]: ${text}`;
};

const fetchWordDetails = async (word) => {
  try {
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    const data = response.data;

    if (data && data.length > 0 && data[0].title !== "No Definitions Found") {
      const firstResult = data[0];
      const firstMeaning = firstResult.meanings?.[0];
      const firstDefinition = firstMeaning?.definitions?.[0];

      let audioUrl = "";
      const phoneticWithAudio = firstResult.phonetics?.find(
        (p) => p.audio && p.audio.endsWith(".mp3")
      );
      if (phoneticWithAudio) {
        audioUrl = phoneticWithAudio.audio;
      } else {
        audioUrl = `https://translate.google.com.vn/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          word
        )}&tl=en&client=tw-ob`;
      }

      const mouthArticulationVideoUrl = `https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&controls=0&showinfo=0&loop=1&playlist=dQw4w9WgXcQ`; // Placeholder

      return {
        word: firstResult.word,
        wordType: firstMeaning?.partOfSpeech || "N/A",
        phonetic:
          firstResult.phonetic ||
          (firstResult.phonetics?.find((p) => p.text) || {}).text ||
          "N/A",
        audioUrl: audioUrl,
        mouthArticulationVideoUrl: mouthArticulationVideoUrl,
        englishDefinition: firstDefinition?.definition || "N/A",
        example: firstDefinition?.example || "N/A",
        synonyms: (firstMeaning?.synonyms || []).slice(0, 5),
        antonyms: (firstMeaning?.antonyms || []).slice(0, 5),
      };
    } else {
      logger.warn(
        `Không tìm thấy định nghĩa hợp lệ từ API từ điển cho từ: ${word}`
      );
      throw new NotFoundError("Không tìm thấy định nghĩa từ điển cho từ này.");
    }
  } catch (error) {
    logger.error(`Lỗi khi tra cứu từ điển cho "${word}": ${error.message}`);
    if (axios.isAxiosError(error)) {
      if (error.response && error.response.status === 404) {
        throw new NotFoundError(`Không tìm thấy từ điển cho "${word}".`);
      }
      throw new APIError(
        `Lỗi khi gọi API từ điển: ${error.message}`,
        error.response ? error.response.status : 500
      );
    }
    throw new APIError(`Lỗi hệ thống khi tra cứu từ điển: ${error.message}`);
  }
};

module.exports = { fetchWordDetails, simulateVietnameseTranslation };
