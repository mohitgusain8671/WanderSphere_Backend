import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minLength: 2,
        maxLength: 70
    },
    lastName: {
        type: String,
        minLength: 2,
        maxLength: 70
    },
    email: {
        type: String,
        required: true,
        minLength: 5,
        maxLength: 255,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minLength: 5,
        maxLength: 1024
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    profilePicture: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', UserSchema);

export default User;