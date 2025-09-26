import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(email, token, firstName) {
    // Use backend URL for verification link
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Verify Your Email Address - WanderSphere",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to WanderSphere, ${firstName}! 🌍</h2>
                    <p>Thank you for joining our travel community. Please verify your email address by clicking the link below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                            ✈️ Verify Email Address
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
                    <p style="color: #666; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        WanderSphere - Your Travel Social Network<br>
                        Discover. Share. Connect.
                    </p>
                </div>
            `,
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetOTP(email, otp, firstName) {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Password Reset OTP",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>Hi ${firstName},</p>
                    <p>You requested to reset your password. Use the OTP below:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP will expire in 15 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `,
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(email, firstName) {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Welcome to Our App!",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome ${firstName}!</h2>
                    <p>Your email has been successfully verified. You can now enjoy all features of our app.</p>
                    <p>Thank you for joining us!</p>
                </div>
            `,
    };

    return await this.transporter.sendMail(mailOptions);
  }
}

export default new EmailService();
