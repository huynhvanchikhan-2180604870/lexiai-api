const Vocabulary = require("../models/Vocabulary");
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User"); // Import User model to get XP and streak
const logger = require("../utils/logger");

/**
 * Calculates and returns various summary statistics for the user's dashboard.
 * @param {string} userId - The ID of the authenticated user.
 * @returns {Promise<object>} - An object containing dashboard summary data.
 */
const getSummaryData = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

  try {
    // Fetch user data for XP, Level, Streak
    const user = await User.findById(userId).select(
      "xp level lastActivityDate streak"
    );
    if (!user) {
      throw new Error("User not found for dashboard summary.");
    }

    // Fetch all vocabulary words for the user
    const vocabularies = await Vocabulary.find({ user: userId });

    let totalWords = vocabularies.length;
    let wordsToday = 0;
    let wordsForReview = 0;
    const wordCountsByDay = {}; // For 7-day chart
    const difficultyCounts = {
      // Count words by difficulty
      Dễ: 0,
      "Trung bình": 0,
      Khó: 0,
      "N/A (AI Failed)": 0,
      "N/A (No Definition)": 0,
      "Chưa xếp loại": 0,
    };

    vocabularies.forEach((word) => {
      // Count words added today
      if (word.addedAt) {
        const addedDate = new Date(word.addedAt);
        addedDate.setHours(0, 0, 0, 0);
        if (addedDate.getTime() === today.getTime()) {
          wordsToday++;
        }

        // Populate word counts by day for the last 7 days
        const dateString = addedDate.toLocaleDateString("vi-VN");
        wordCountsByDay[dateString] = (wordCountsByDay[dateString] || 0) + 1;
      }

      // Count words due for review
      if (word.nextReviewAt) {
        const nextReviewDate = new Date(word.nextReviewAt);
        if (nextReviewDate.getTime() <= today.getTime()) {
          wordsForReview++;
        }
      }

      // Count words by difficulty
      const difficulty = word.difficulty || "Chưa xếp loại";
      if (difficultyCounts.hasOwnProperty(difficulty)) {
        difficultyCounts[difficulty]++;
      } else {
        difficultyCounts[difficulty] = (difficultyCounts[difficulty] || 0) + 1;
      }
    });

    // Prepare 7-day data structure, ensuring all 7 days are present
    const sevenDayData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const dayString = day.toLocaleDateString("vi-VN");
      sevenDayData.push({
        date: dayString.slice(0, 5), // E.g., "DD/MM"
        count: wordCountsByDay[dayString] || 0,
      });
    }

    // Fetch recent activities (limit to last 5 for dashboard display)
    const recentActivities = await ActivityLog.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("activityType description createdAt"); // Select specific fields

    return {
      totalWords,
      wordsToday,
      wordsForReview,
      difficultyCounts,
      sevenDayData,
      recentActivities: recentActivities.map((log) => ({
        // Format for frontend
        type: log.activityType,
        desc: log.description,
        time: log.createdAt,
      })),
      xp: user.xp,
      level: user.level,
      learningStreak: user.streak,
    };
  } catch (error) {
    logger.error(
      `Error fetching dashboard summary for user ${userId}: ${error.message}`
    );
    throw new Error("Failed to retrieve dashboard summary data.");
  }
};

module.exports = { getSummaryData };
