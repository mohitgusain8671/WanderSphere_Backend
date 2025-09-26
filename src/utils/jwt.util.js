import jwt from 'jsonwebtoken';

class JWTUtil {
    static generateToken(payload, expiresIn = '24h') {
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
    }

    static generateRefreshToken(payload) {
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    static verifyRefreshToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    static generateEmailVerificationToken(userId) {
        return jwt.sign({ userId, type: 'email_verification' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }

    static generatePasswordResetToken(userId) {
        return jwt.sign({ userId, type: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    }
}

export default JWTUtil;