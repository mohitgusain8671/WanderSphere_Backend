import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    token: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['email_verification', 'forgot_password'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: {
            expires: 43200 // Automatically deletes documents after 12 hours
        }
    },
    expiresAt: {
        type: Date,
        required: true,
    },
});

const Token = mongoose.model("Token", tokenSchema);
export default Token;