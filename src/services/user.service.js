import bcrypt from 'bcrypt';
import User from '#models/users.model.js';
import Token from '#models/token.model.js';
import JWTUtil from '#utils/jwt.util.js';
import OTPUtil from '#utils/otp.util.js';

class UserService {
    async findUserByEmail(email) {
        return await User.findOne({ email: email.toLowerCase() });
    }

    async findUserById(id) {
        return await User.findById(id).select('-password');
    }

    async createUser(userData) {
        const { firstName, lastName, email, password } = userData;
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            isVerified: false
        });

        return await user.save();
    }

    async updateUser(userId, updateData) {
        const { password, ...otherData } = updateData;
        
        if (password) {
            otherData.password = await bcrypt.hash(password, 12);
        }
        
        otherData.updatedAt = new Date();
        
        return await User.findByIdAndUpdate(
            userId, 
            otherData, 
            { new: true, runValidators: true }
        ).select('-password');
    }

    async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    async generateAuthTokens(user) {
        const payload = {
            userId: user._id,
            email: user.email,
            role: user.role
        };

        const accessToken = JWTUtil.generateToken(payload);
        const refreshToken = JWTUtil.generateRefreshToken(payload);

        return { accessToken, refreshToken };
    }

    async createVerificationToken(userId) {
        // Delete existing verification tokens
        await Token.deleteMany({ 
            userId, 
            type: 'email_verification' 
        });

        const token = OTPUtil.generateSecureToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        const verificationToken = new Token({
            userId,
            token,
            type: 'email_verification',
            expiresAt
        });

        await verificationToken.save();
        return token;
    }

    async createPasswordResetOTP(userId) {
        // Delete existing password reset tokens
        await Token.deleteMany({ 
            userId, 
            type: 'forgot_password' 
        });

        const otp = OTPUtil.generateOTP(6);
        const hashedOTP = OTPUtil.hashOTP(otp);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        const resetToken = new Token({
            userId,
            token: hashedOTP,
            type: 'forgot_password',
            expiresAt
        });

        await resetToken.save();
        return otp;
    }

    async verifyEmailToken(token) {
        const tokenDoc = await Token.findOne({
            token,
            type: 'email_verification',
            expiresAt: { $gt: new Date() }
        });

        if (!tokenDoc) {
            throw new Error('Invalid or expired verification token');
        }

        const user = await User.findByIdAndUpdate(
            tokenDoc.userId,
            { isVerified: true, updatedAt: new Date() },
            { new: true }
        ).select('-password');

        await Token.deleteOne({ _id: tokenDoc._id });
        return user;
    }

    async verifyPasswordResetOTP(userId, otp) {
        const tokenDoc = await Token.findOne({
            userId,
            type: 'forgot_password',
            expiresAt: { $gt: new Date() }
        });

        if (!tokenDoc) {
            throw new Error('Invalid or expired OTP');
        }

        const isValidOTP = OTPUtil.verifyOTP(otp, tokenDoc.token);
        if (!isValidOTP) {
            throw new Error('Invalid OTP');
        }

        return tokenDoc;
    }

    async resetPassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        const user = await User.findByIdAndUpdate(
            userId,
            { 
                password: hashedPassword,
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');

        // Delete all password reset tokens for this user
        await Token.deleteMany({ 
            userId, 
            type: 'forgot_password' 
        });

        return user;
    }

    // Search users by name or email
    async searchUsers(query, limit = 10, page = 1) {
        const skip = (page - 1) * limit;
        
        const searchRegex = new RegExp(query, 'i');
        
        const users = await User.find({
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { 
                    $expr: {
                        $regexMatch: {
                            input: { $concat: ['$firstName', ' ', '$lastName'] },
                            regex: searchRegex
                        }
                    }
                }
            ],
            isVerified: true
        })
        .select('firstName lastName email profilePicture bio travelStatus statusColor badges createdAt')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

        return users;
    }
}

export default new UserService();
