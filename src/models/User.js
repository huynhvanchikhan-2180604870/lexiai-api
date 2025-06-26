const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
  },
  lastLoginTimestamp: {
    type: Date,
    default: Date.now,
  },
  // Gamification fields
  xp: {
    // Experience Points
    type: Number,
    default: 0,
  },
  level: {
    // User's level based on XP
    type: Number,
    default: 1,
  },
  lastActivityDate: {
    // Last date user completed an exercise (for streak calculation)
    type: Date,
    default: null,
  },
  streak: {
    // Consecutive days of learning
    type: Number,
    default: 0,
  },
  // Daily Check-in fields
  lastCheckInDate: {
    // Last date user checked in
    type: Date,
    default: null,
  },
  betaRewards: {
    // Number of 'beta' rewards collected
    type: Number,
    default: 0,
  },
  // End Gamification fields
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
