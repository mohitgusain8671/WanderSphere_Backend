import express from 'express';
import {
  registerAsBuddy,
  updateBuddyRegistration,
  getMyBuddyProfile,
  updateBuddyProfile,
  searchBuddies,
  getBuddyById,
  createBookingRequest,
  createBookingByBuddy,
  respondToBooking,
  updateBookingStatus,
  rateBooking,
  getUserBookingHistory,
  getBuddyBookingHistory,
  getBookingById,
  reportBuddy,
  getAllBuddyRegistrations,
  updateBuddyStatus,
  banBuddy,
  getAllBookings,
  getAllReports,
  updateReportStatus,
  getBuddyStatistics,
} from '#controllers/localBuddy.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { checkAdmin, checkPermission } from '#middleware/admin.middleware.js';
import { uploadBuddyDocuments } from '#config/s3.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== USER ROUTES ====================
// Buddy Registration
router.post('/register', registerAsBuddy);
router.put('/registration/update', updateBuddyRegistration);
router.get('/my-profile', getMyBuddyProfile);
router.put('/profile/update', updateBuddyProfile);

// Search & View Buddies
router.get('/search', searchBuddies);
router.get('/:id', getBuddyById);

// Bookings
router.post('/booking/create', createBookingRequest);
router.post('/booking/create-by-buddy', createBookingByBuddy);
router.put('/booking/:bookingId/respond', respondToBooking);
router.put('/booking/:bookingId/status', updateBookingStatus);
router.post('/booking/:bookingId/rate', rateBooking);
router.get('/booking/user/history', getUserBookingHistory);
router.get('/booking/buddy/history', getBuddyBookingHistory);
router.get('/booking/:bookingId/details', getBookingById);

// Reports
router.post('/report', reportBuddy);

// File Uploads
router.post('/upload/documents', uploadBuddyDocuments.array('documents', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const uploadedFiles = req.files.map(file => ({
      url: file.location,
      key: file.key,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { files: uploadedFiles },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading documents',
    });
  }
});

router.post('/upload/profile-picture', uploadBuddyDocuments.single('profilePicture'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        url: req.file.location,
        key: req.file.key,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile picture',
    });
  }
});

// ==================== ADMIN ROUTES ====================
router.get('/admin/registrations', checkAdmin, checkPermission('buddy_management'), getAllBuddyRegistrations);
router.put('/admin/:id/status', checkAdmin, checkPermission('buddy_management'), updateBuddyStatus);
router.put('/admin/:id/ban', checkAdmin, checkPermission('buddy_management'), banBuddy);
router.get('/admin/bookings', checkAdmin, checkPermission('buddy_management'), getAllBookings);
router.get('/admin/reports', checkAdmin, checkPermission('buddy_management'), getAllReports);
router.put('/admin/reports/:id', checkAdmin, checkPermission('buddy_management'), updateReportStatus);
router.get('/admin/statistics', checkAdmin, checkPermission('buddy_management'), getBuddyStatistics);

export default router;
