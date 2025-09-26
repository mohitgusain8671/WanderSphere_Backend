import crypto from 'crypto';

class OTPUtil {
    static generateOTP(length = 6) {
        const digits = '0123456789';
        let otp = '';
        
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * 10)];
        }
        
        return otp;
    }

    static generateSecureToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    static hashOTP(otp) {
        return crypto.createHash('sha256').update(otp).digest('hex');
    }

    static verifyOTP(inputOTP, hashedOTP) {
        const hashedInput = this.hashOTP(inputOTP);
        return hashedInput === hashedOTP;
    }
}

export default OTPUtil;