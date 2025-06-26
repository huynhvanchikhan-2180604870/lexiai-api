const Vocabulary = require("../models/Vocabulary");
const dictionaryService = require("./dictionaryService");
const logger = require("../utils/logger");
const aiService = require("./aiService");
const {
  BadRequestError,
  NotFoundError,
  APIError,
} = require("../utils/errorUtils");

/**
 * Automatically classifies word difficulty using Gemini AI.
 * This function no longer has a static fallback. If AI classification fails,
 * it will throw an APIError which is then caught in addWord, leading to 'N/A (AI Failed)'.
 * @param {string} word - The English word to classify.
 * @param {string} definition - The English definition of the word.
 * @returns {Promise<string>} - Predicted difficulty: 'Dễ', 'Trung bình', 'Khó'.
 * @throws {APIError} If AI classification fails.
 */
const autoClassifyDifficulty = async (word, definition) => {
  // Directly call AI service. If AI fails, it will throw an error as per aiService's strict handling.
  const aiDifficulty = await aiService.getGeminiDifficultyClassification(
    word,
    definition
  );
  return aiDifficulty;
};

/**
 * Adds a new vocabulary word to a user's collection, enriching details via dictionary and AI.
 * Handles AI failures by setting relevant fields to 'N/A (AI Failed)' or empty arrays.
 * @param {string} userId - The ID of the user adding the word.
 * @param {string} word - The English word to add.
 * @returns {Promise<object>} - The newly created vocabulary document.
 * @throws {BadRequestError} If the word already exists for the user.
 * @throws {APIError|NotFoundError} If dictionary lookup fails critically.
 */
const addWord = async (userId, word) => {
  const existingWord = await Vocabulary.findOne({
    user: userId,
    word: word.toLowerCase(),
  });
  if (existingWord) {
    throw new BadRequestError(
      "This word already exists in your vocabulary list."
    );
  }

  let dictionaryData;
  try {
    dictionaryData = await dictionaryService.fetchWordDetails(word);
  } catch (error) {
    logger.warn(
      `Failed to fetch dictionary data for "${word}": ${error.message}. Proceeding with minimal data.`
    );
    // Fallback to minimal data if dictionary API fails, but still attempt AI enrichment/translation
    dictionaryData = {
      word: word,
      wordType: "N/A",
      phonetic: "N/A",
      audioUrl: `https://translate.google.com.vn/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        word
      )}&tl=en&client=tw-ob`,
      mouthArticulationVideoUrl: `https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&controls=0&showinfo=0&loop=1&playlist=dQw4w9WgXcQ`,
      englishDefinition: error.message || "No definition found for this word.",
      example: "N/A",
      synonyms: [],
      antonyms: [],
    };
  }

  // Initialize enriched data with what's available from the dictionary
  let enrichedData = {
    example: dictionaryData.example,
    synonyms: dictionaryData.synonyms,
    antonyms: dictionaryData.antonyms,
  };
  let vietnameseDefinition = "N/A";
  let vietnameseExample = "N/A";
  let difficulty = "N/A (AI Failed)"; // Default difficulty
  let conciseTranslation = "N/A (AI Failed)"; // Default concise translation

  // Check if there's a valid English definition to proceed with AI-dependent tasks
  const hasValidEnglishDefinition =
    dictionaryData.englishDefinition &&
    dictionaryData.englishDefinition !== "N/A" &&
    dictionaryData.englishDefinition !== "No definition found for this word.";

  if (hasValidEnglishDefinition) {
    // 1. Get concise translation for the word
    try {
      conciseTranslation = await aiService.getGeminiConciseTranslation(word);
    } catch (error) {
      logger.error(
        `AI concise translation failed for "${word}": ${error.message}. Defaulting to 'N/A (AI Failed)'.`
      );
      conciseTranslation = "N/A (AI Failed)";
    }

    // 2. Attempt AI enrichment if primary dictionary data is missing
    const needsEnrichment =
      enrichedData.example === "N/A" ||
      !enrichedData.example ||
      enrichedData.synonyms.length === 0 ||
      enrichedData.antonyms.length === 0;
    if (needsEnrichment) {
      try {
        const aiEnrichment = await aiService.getGeminiWordDetailsEnrichment(
          dictionaryData.word,
          dictionaryData.englishDefinition
        );
        if (aiEnrichment.example && aiEnrichment.example !== "N/A") {
          enrichedData.example = aiEnrichment.example;
        }
        if (
          Array.isArray(aiEnrichment.synonyms) &&
          aiEnrichment.synonyms.length > 0
        ) {
          enrichedData.synonyms = aiEnrichment.synonyms;
        }
        if (
          Array.isArray(aiEnrichment.antonyms) &&
          aiEnrichment.antonyms.length > 0
        ) {
          enrichedData.antonyms = aiEnrichment.antonyms;
        }
        logger.info(
          `AI successfully enriched details for "${dictionaryData.word}".`
        );
      } catch (error) {
        logger.error(
          `AI enrichment failed for "${dictionaryData.word}": ${error.message}. Defaulting enriched fields to 'N/A (AI Failed)'.`
        );
        if (enrichedData.example === "N/A" || !enrichedData.example)
          enrichedData.example = "N/A (AI Failed)";
        if (enrichedData.synonyms.length === 0) enrichedData.synonyms = [];
        if (enrichedData.antonyms.length === 0) enrichedData.antonyms = [];
      }
    }

    // 3. Translate definition to Vietnamese using AI
    try {
      vietnameseDefinition = await aiService.getGeminiTranslation(
        dictionaryData.englishDefinition
      );
    } catch (error) {
      logger.error(
        `AI translation failed for definition "${dictionaryData.englishDefinition}": ${error.message}. Defaulting to 'N/A (AI Translation Failed)'.`
      );
      vietnameseDefinition = "N/A (AI Translation Failed)";
    }

    // 4. Translate example to Vietnamese using AI
    if (
      enrichedData.example &&
      enrichedData.example !== "N/A" &&
      enrichedData.example !== "N/A (AI Failed)"
    ) {
      try {
        vietnameseExample = await aiService.getGeminiTranslation(
          enrichedData.example
        );
      } catch (error) {
        logger.error(
          `AI translation failed for example "${enrichedData.example}": ${error.message}. Defaulting to 'N/A (AI Translation Failed)'.`
        );
        vietnameseExample = "N/A (AI Translation Failed)";
      }
    }

    // 5. Get difficulty classification from AI (no static fallback)
    try {
      difficulty = await autoClassifyDifficulty(
        word,
        dictionaryData.englishDefinition
      );
    } catch (error) {
      logger.error(
        `Final AI difficulty classification failed for "${word}": ${error.message}. Defaulting to 'N/A (AI Failed)'.`
      );
      difficulty = "N/A (AI Failed)";
    }
  } else {
    // If no English definition, all AI-dependent fields are simply N/A or empty
    enrichedData.example = "N/A";
    enrichedData.synonyms = [];
    enrichedData.antonyms = [];
    vietnameseDefinition = "N/A (No Definition)";
    vietnameseExample = "N/A (No Definition)";
    difficulty = "N/A (No Definition)";
    conciseTranslation = "N/A (No Definition)";
  }

  const newVocab = new Vocabulary({
    user: userId,
    word: dictionaryData.word,
    translation: conciseTranslation, // New field: concise translation of the word
    wordType: dictionaryData.wordType,
    phonetic: dictionaryData.phonetic,
    audioUrl: dictionaryData.audioUrl,
    mouthArticulationVideoUrl: dictionaryData.mouthArticulationVideoUrl,
    englishDefinition: dictionaryData.englishDefinition,
    example: enrichedData.example,
    synonyms: enrichedData.synonyms,
    antonyms: enrichedData.antonyms,
    vietnameseDefinition: vietnameseDefinition,
    vietnameseExample: vietnameseExample,
    cambridgeLink: `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(
      word
    )}`,
    difficulty: difficulty,
    lastReviewedAt: null,
    nextReviewAt: Date.now(), // New words are ready for immediate review
    easeFactor: 2.5,
    repetitions: 0,
  });

  await newVocab.save();
  return newVocab;
};

/**
 * Retrieves all vocabulary words for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array<object>>} - A list of vocabulary documents.
 */
const getWordsByUser = async (userId) => {
  const vocabularies = await Vocabulary.find({ user: userId }).sort({
    addedAt: -1,
  });
  return vocabularies;
};

/**
 * Retrieves a single vocabulary word by its ID for a specific user.
 * @param {string} wordId - The ID of the vocabulary document.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} - The vocabulary document.
 * @throws {NotFoundError} If the word is not found or not owned by the user.
 */
const getWordById = async (wordId, userId) => {
  const vocab = await Vocabulary.findOne({ _id: wordId, user: userId });
  if (!vocab) {
    throw new NotFoundError("Vocabulary not found or unauthorized access.");
  }
  return vocab;
};

/**
 * Updates an existing vocabulary word.
 * @param {string} wordId - The ID of the vocabulary document to update.
 * @param {string} userId - The ID of the user owning the word.
 * @param {object} updateData - Data to update.
 * @returns {Promise<object>} - The updated vocabulary document.
 * @throws {NotFoundError} If the word is not found or not owned by the user.
 */
const updateWord = async (wordId, userId, updateData) => {
  const vocab = await Vocabulary.findOne({ _id: wordId, user: userId });
  if (!vocab) {
    throw new NotFoundError("Vocabulary not found or unauthorized access.");
  }

  Object.assign(vocab, updateData);
  vocab.updatedAt = Date.now();
  await vocab.save();
  return vocab;
};

/**
 * Deletes a vocabulary word.
 * @param {string} wordId - The ID of the vocabulary document to delete.
 * @param {string} userId - The ID of the user owning the word.
 * @returns {Promise<object>} - The deleted vocabulary document.
 * @throws {NotFoundError} If the word is not found or not owned by the user.
 */
const deleteWord = async (wordId, userId) => {
  const vocab = await Vocabulary.findOneAndDelete({
    _id: wordId,
    user: userId,
  });
  if (!vocab) {
    throw new NotFoundError("Vocabulary not found or unauthorized access.");
  }
  return vocab;
};

module.exports = {
  addWord,
  getWordsByUser,
  getWordById,
  updateWord,
  deleteWord,
  autoClassifyDifficulty,
};
