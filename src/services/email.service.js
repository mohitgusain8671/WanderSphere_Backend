import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    // Initialize SendGrid with API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendVerificationEmail(email, token, firstName) {
    // Use backend URL for verification link
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;

    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: 'WanderSphere'
      },
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

    try {
      await sgMail.send(msg);
      console.log('Verification email sent successfully to:', email);
    } catch (error) {
      console.error('SendGrid verification email error:', error);
      throw error;
    }
  }

  async sendPasswordResetOTP(email, otp, firstName) {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: 'WanderSphere'
      },
      subject: "Password Reset OTP - WanderSphere",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request 🔐</h2>
                    <p>Hi ${firstName},</p>
                    <p>You requested to reset your password for your WanderSphere account. Use the OTP below:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; border-radius: 8px; border: 2px solid #3B82F6;">
                        ${otp}
                    </div>
                    <p style="color: #EF4444; font-weight: bold;">⏰ This OTP will expire in 15 minutes.</p>
                    <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        WanderSphere - Your Travel Social Network<br>
                        Discover. Share. Connect.
                    </p>
                </div>
            `,
    };

    try {
      await sgMail.send(msg);
      console.log('Password reset OTP sent successfully to:', email);
    } catch (error) {
      console.error('SendGrid password reset email error:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email, firstName) {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: 'WanderSphere'
      },
      subject: "Welcome to WanderSphere! 🎉",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #3B82F6, #10B981); border-radius: 8px; margin-bottom: 20px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🌍 Welcome to WanderSphere!</h1>
                    </div>
                    <h2 style="color: #3B82F6;">Hello ${firstName}! 👋</h2>
                    <p>Your email has been successfully verified! You're now part of the WanderSphere travel community.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #10B981; margin-top: 0;">🚀 What's Next?</h3>
                        <ul style="color: #666;">
                            <li>✈️ Discover amazing travel destinations</li>
                            <li>📸 Share your travel stories and photos</li>
                            <li>🤝 Connect with fellow travelers</li>
                            <li>🗺️ Plan your next adventure</li>
                        </ul>
                    </div>
                    
                    <p>Start exploring and sharing your travel experiences with our community!</p>
                    <p style="color: #666; font-size: 14px;">Thank you for joining WanderSphere. Happy travels! ✈️</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        WanderSphere - Your Travel Social Network<br>
                        Discover. Share. Connect.
                    </p>
                </div>
            `,
    };

    try {
      await sgMail.send(msg);
      console.log('Welcome email sent successfully to:', email);
    } catch (error) {
      console.error('SendGrid welcome email error:', error);
      throw error;
    }
  }

  /**
   * Generic send email function for admin operations
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content (optional)
   */
  async sendEmail({ to, subject, html, text }) {
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: 'WanderSphere'
      },
      subject,
      html: html || text,
    };

    if (text && !html) {
      msg.text = text;
    }

    try {
      await sgMail.send(msg);
      console.log('Email sent successfully to:', to);
      return { success: true };
    } catch (error) {
      console.error('SendGrid email error:', error);
      throw error;
    }
  }
}

// Export both the class instance and the sendEmail function
const emailService = new EmailService();

// Export the sendEmail function directly for easier imports
export const sendEmail = emailService.sendEmail.bind(emailService);

export default emailService;
