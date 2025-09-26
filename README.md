# Mobile App Backend - Authentication System

A comprehensive authentication system built for mobile applications with Node.js, Express, MongoDB, and JWT.

## Features

- ✅ User Registration with Email Verification
- ✅ User Login with JWT Authentication
- ✅ Password Reset with OTP
- ✅ Email Verification for Mobile Apps
- ✅ Secure Password Hashing
- ✅ JWT Token Management
- ✅ Email Service Integration
- ✅ Comprehensive Error Handling
- ✅ Input Validation
- ✅ Mobile App Deep Link Support

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   └── auth.controller.js   # Authentication controllers
│   ├── middleware/
│   │   └── auth.middleware.js   # JWT authentication 
│   ├── models/
│   │   ├── users.model.js       # User schema
│   │   └── token.model.js       # Token schema for verification/reset
│   ├── routes/
│   │   └── auth.routes.js       # Authentication routes
│   ├── services/
│   │   ├── email.service.js     # Email sending service
│   │   └── user.service.js      # User business logic
│   ├── utils/
│   │   ├── jwt.util.js          # JWT token utilities
│   │   └── otp.util.js          # OTP generation utilities
│   ├── validations/
│   │   └── auth.validation.js   # Input validation middleware
│   ├── app.js                   # Express app configuration
│   ├── server.js                # Server startup
│   └── index.js                 # Entry point
├── .env                         # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/your_app_name

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   FROM_EMAIL=your_email@gmail.com

   # Frontend/Mobile App Configuration
   FRONTEND_URL=http://localhost:3000
   MOBILE_APP_SCHEME=yourapp
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication Routes

All routes are prefixed with `/api/auth`

#### 1. Register User
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "User registered successfully. Please check your email for verification link.",
    "data": {
      "userId": "user_id",
      "email": "john@example.com",
      "isVerified": false
    }
  }
  ```

#### 2. Verify Email
- **GET** `/api/auth/verify-email?token=verification_token`
- **Response:** Redirects to mobile app with success/error status

#### 3. Login User
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "isVerified": true
      },
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
  ```

#### 4. Forgot Password
- **POST** `/api/auth/forgot-password`
- **Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Password reset OTP sent to your email",
    "data": {
      "userId": "user_id"
    }
  }
  ```

#### 5. Reset Password
- **POST** `/api/auth/reset-password`
- **Body:**
  ```json
  {
    "userId": "user_id",
    "otp": "123456",
    "newPassword": "newpassword123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Password reset successfully",
    "data": {
      "userId": "user_id"
    }
  }
  ```

#### 6. Get User Profile (Protected)
- **GET** `/api/auth/profile`
- **Headers:** `Authorization: Bearer jwt_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "isVerified": true
      }
    }
  }
  ```

#### 7. Logout (Protected)
- **POST** `/api/auth/logout`
- **Headers:** `Authorization: Bearer jwt_token`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

## Mobile App Integration

### Deep Links
The system supports mobile app deep links for email verification:
- Success: `yourapp://email-verified?success=true`
- Error: `yourapp://email-verified?success=false&error=error_message`

### Authentication Flow
1. User registers → Receives verification email
2. User clicks email link → Redirects to mobile app
3. User logs in → Receives JWT tokens
4. Use JWT token in Authorization header for protected routes

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT tokens with expiration
- Email verification required before login
- OTP-based password reset
- Input validation and sanitization
- CORS protection
- Rate limiting ready (can be added)

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## Development

- **Start development server:** `npm run dev`
- **Start production server:** `npm start`

## Environment Variables

Make sure to set all required environment variables in your `.env` file before running the application.

## License

ISC