import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    minLength: 2,
    maxLength: 70,
  },
  lastName: {
    type: String,
    minLength: 2,
    maxLength: 70,
  },
  email: {
    type: String,
    required: true,
    minLength: 5,
    maxLength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minLength: 5,
    maxLength: 1024,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  profilePicture: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    default: null,
    maxLength: 500,
  },
  travelStatus: {
    type: String,
    default: "Ready to Explore",
    enum: [
      "Ready to Explore",
      "Currently Traveling",
      "Planning Next Trip",
      "Back Home",
      "Adventure Mode",
    ],
  },
  statusColor: {
    type: String,
    default: "#10B981",
    validate: {
      validator: function (v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: "Status color must be a valid hex color",
    },
  },
  badges: {
    type: [String],
    default: ["Explorer"],
    validate: {
      validator: function (v) {
        return v.length <= 4;
      },
      message: "Maximum 4 badges allowed",
    },
    enum: [
      "Explorer",
      "Photographer",
      "Adventurer",
      "Foodie",
      "Hiker",
      "Beach Lover",
      "City Explorer",
      "Solo Traveler",
    ],
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);

export default User;
