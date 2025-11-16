import LocalBuddy from '#models/localBuddy.model.js';
import Booking from '#models/booking.model.js';
import BuddyReport from '#models/buddyReport.model.js';
import User from '#models/users.model.js';
import Chat from '#models/chat.model.js';
import { sendEmail } from '#services/email.service.js';

// ==================== USER FUNCTIONS ====================

// Register as Local Buddy
export const registerAsBuddy = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      buddyName,
      phone,
      email,
      profilePicture,
      description,
      documents,
      services,
      locations,
      pricing,
    } = req.body;

    // Check if user already registered
    const existingBuddy = await LocalBuddy.findOne({ userId });
    if (existingBuddy) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered as a Local Buddy',
      });
    }

    // Validate required fields
    if (!buddyName || !phone || !email || !description || !services || !locations) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    const buddy = new LocalBuddy({
      userId,
      buddyName,
      phone,
      email,
      profilePicture,
      description,
      documents: documents || [],
      services,
      locations,
      pricing: pricing || {},
      status: 'pending',
    });

    await buddy.save();

    res.status(201).json({
      success: true,
      message: 'Buddy registration submitted successfully. Awaiting admin approval.',
      data: { buddy },
    });
  } catch (error) {
    console.error('Register buddy error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering as buddy',
    });
  }
};

// Update Buddy Registration (for rejected status)
export const updateBuddyRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const buddy = await LocalBuddy.findOne({ userId });
    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy registration not found',
      });
    }

    if (buddy.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Can only update rejected registrations',
      });
    }

    // Update fields
    Object.assign(buddy, updates);
    buddy.status = 'pending';
    buddy.rejectionReason = null;
    buddy.updatedAt = new Date();

    await buddy.save();

    res.status(200).json({
      success: true,
      message: 'Buddy registration updated and resubmitted',
      data: { buddy },
    });
  } catch (error) {
    console.error('Update buddy registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating buddy registration',
    });
  }
};

// Get My Buddy Profile
export const getMyBuddyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const buddy = await LocalBuddy.findOne({ userId }).populate('userId', 'firstName lastName email profilePicture');
    
    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { buddy },
    });
  } catch (error) {
    console.error('Get buddy profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching buddy profile',
    });
  }
};

// Update Buddy Profile (for approved buddies)
export const updateBuddyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const buddy = await LocalBuddy.findOne({ userId });
    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy profile not found',
      });
    }

    if (buddy.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved buddies can update their profile',
      });
    }

    // Allow updating specific fields
    const allowedUpdates = ['buddyName', 'phone', 'email', 'description', 'profilePicture', 'services', 'locations', 'pricing', 'isAvailable'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        buddy[key] = updates[key];
      }
    });

    buddy.updatedAt = new Date();
    await buddy.save();

    res.status(200).json({
      success: true,
      message: 'Buddy profile updated successfully',
      data: { buddy },
    });
  } catch (error) {
    console.error('Update buddy profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating buddy profile',
    });
  }
};

// Search Local Buddies
export const searchBuddies = async (req, res) => {
  try {
    const {
      location,
      latitude,
      longitude,
      buddyName,
      services,
      minRating,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { status: 'approved', isAvailable: true };

    // Search by buddy name
    if (buddyName) {
      filter.buddyName = { $regex: buddyName, $options: 'i' };
    }

    // Filter by services
    if (services) {
      const serviceArray = Array.isArray(services) ? services : [services];
      filter.services = { $in: serviceArray };
    }

    // Filter by rating
    if (minRating) {
      filter['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Filter by price
    if (maxPrice) {
      filter.$or = [
        { 'pricing.hourlyRate': { $lte: parseFloat(maxPrice) } },
        { 'pricing.perDayCharge': { $lte: parseFloat(maxPrice) } },
      ];
    }

    // Filter by location (city/country)
    if (location) {
      filter.$or = [
        { 'locations.city': { $regex: location, $options: 'i' } },
        { 'locations.country': { $regex: location, $options: 'i' } },
      ];
    }

    let query = LocalBuddy.find(filter).populate('userId', 'firstName lastName profilePicture');

    // Geospatial search if coordinates provided
    if (latitude && longitude) {
      query = LocalBuddy.find({
        ...filter,
        'locations.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: 50000, // 50km radius
          },
        },
      }).populate('userId', 'firstName lastName profilePicture');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [buddies, total] = await Promise.all([
      query.sort({ 'rating.average': -1, totalBookings: -1 }).skip(skip).limit(parseInt(limit)),
      LocalBuddy.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        buddies,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Search buddies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching buddies',
    });
  }
};

// Get Buddy by ID
export const getBuddyById = async (req, res) => {
  try {
    const { id } = req.params;

    const buddy = await LocalBuddy.findById(id)
      .populate('userId', 'firstName lastName email profilePicture bio');

    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy not found',
      });
    }

    if (buddy.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Buddy profile is not available',
      });
    }

    // Get recent reviews
    const recentBookings = await Booking.find({
      buddyId: id,
      status: 'completed',
      'rating.score': { $exists: true },
    })
      .populate('userId', 'firstName lastName profilePicture')
      .sort({ 'rating.ratedAt': -1 })
      .limit(10);

    const reviews = recentBookings.map(booking => ({
      user: booking.userId,
      rating: booking.rating.score,
      review: booking.rating.review,
      date: booking.rating.ratedAt,
    }));

    res.status(200).json({
      success: true,
      data: { buddy, reviews },
    });
  } catch (error) {
    console.error('Get buddy by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching buddy details',
    });
  }
};

// ==================== BOOKING FUNCTIONS ====================

// Create Booking Request (by User)
export const createBookingRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      buddyId,
      serviceType,
      location,
      startDate,
      endDate,
      duration,
      totalAmount,
      message,
    } = req.body;

    // Validate buddy
    const buddy = await LocalBuddy.findById(buddyId);
    if (!buddy || buddy.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Buddy not found or not available',
      });
    }

    const booking = new Booking({
      userId,
      buddyId,
      serviceType,
      location,
      startDate,
      endDate,
      duration,
      totalAmount,
      message,
      initiatedBy: 'user',
      status: 'pending',
    });

    await booking.save();

    // Create or get chat between user and buddy
    let chat = await Chat.findOne({
      isGroupChat: false,
      participants: { $all: [userId, buddy.userId] },
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, buddy.userId],
        isGroupChat: false,
      });
      await chat.save();
    }

    booking.chatId = chat._id;
    await booking.save();

    // Send email notification to buddy
    const user = await User.findById(userId);
    try {
      await sendEmail({
        to: buddy.email,
        subject: 'New Booking Request',
        html: `<p>Hi ${buddy.buddyName},</p>
               <p>You have received a new booking request from ${user.firstName} ${user.lastName}.</p>
               <p><strong>Service:</strong> ${serviceType}</p>
               <p><strong>Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
               <p><strong>Amount:</strong> ₹${totalAmount}</p>
               <p>Please log in to your account to respond.</p>`,
      });
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Booking request sent successfully',
      data: { booking },
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking request',
    });
  }
};

// Create Booking (by Buddy for User)
export const createBookingByBuddy = async (req, res) => {
  try {
    const buddyUserId = req.user.id;
    const {
      userId,
      serviceType,
      location,
      startDate,
      endDate,
      duration,
      totalAmount,
      message,
    } = req.body;

    // Verify buddy
    const buddy = await LocalBuddy.findOne({ userId: buddyUserId });
    if (!buddy || buddy.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'You are not an approved buddy',
      });
    }

    const booking = new Booking({
      userId,
      buddyId: buddy._id,
      serviceType,
      location,
      startDate,
      endDate,
      duration,
      totalAmount,
      message,
      initiatedBy: 'buddy',
      status: 'pending',
    });

    await booking.save();

    // Create or get chat
    let chat = await Chat.findOne({
      isGroupChat: false,
      participants: { $all: [userId, buddyUserId] },
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, buddyUserId],
        isGroupChat: false,
      });
      await chat.save();
    }

    booking.chatId = chat._id;
    await booking.save();

    // Send email to user
    const user = await User.findById(userId);
    try {
      await sendEmail({
        to: user.email,
        subject: 'New Booking from Local Buddy',
        html: `<p>Hi ${user.firstName},</p>
               <p>${buddy.buddyName} has created a booking for you.</p>
               <p><strong>Service:</strong> ${serviceType}</p>
               <p><strong>Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
               <p><strong>Amount:</strong> ₹${totalAmount}</p>
               <p>Please log in to your account to review and accept.</p>`,
      });
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking },
    });
  } catch (error) {
    console.error('Create booking by buddy error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
    });
  }
};

// Respond to Booking (Accept/Reject by Buddy)
export const respondToBooking = async (req, res) => {
  try {
    const buddyUserId = req.user.id;
    const { bookingId } = req.params;
    const { action, message } = req.body; // action: 'accept' or 'reject'

    const buddy = await LocalBuddy.findOne({ userId: buddyUserId });
    if (!buddy) {
      return res.status(403).json({
        success: false,
        message: 'You are not a registered buddy',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.buddyId.toString() !== buddy._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to respond to this booking',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking has already been responded to',
      });
    }

    booking.status = action === 'accept' ? 'accepted' : 'rejected';
    booking.buddyResponse = {
      message: message || '',
      respondedAt: new Date(),
    };
    booking.updatedAt = new Date();

    await booking.save();

    // Update buddy stats if accepted
    if (action === 'accept') {
      buddy.totalBookings += 1;
      await buddy.save();
    }

    // Send email to user
    const user = await User.findById(booking.userId);
    try {
      await sendEmail({
        to: user.email,
        subject: `Booking ${action === 'accept' ? 'Accepted' : 'Rejected'}`,
        html: `<p>Hi ${user.firstName},</p>
               <p>Your booking request with ${buddy.buddyName} has been ${action === 'accept' ? 'accepted' : 'rejected'}.</p>
               ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
               <p>Booking ID: ${booking.bookingId}</p>`,
      });
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    res.status(200).json({
      success: true,
      message: `Booking ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
      data: { booking },
    });
  } catch (error) {
    console.error('Respond to booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to booking',
    });
  }
};

// Update Booking Status
export const updateBookingStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;
    const { status } = req.body; // 'ongoing', 'completed', 'cancelled'

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization
    const buddy = await LocalBuddy.findOne({ userId });
    const isUser = booking.userId.toString() === userId;
    const isBuddy = buddy && booking.buddyId.toString() === buddy._id.toString();

    if (!isUser && !isBuddy) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this booking',
      });
    }

    // Validate status transitions
    if (status === 'ongoing' && booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Can only mark accepted bookings as ongoing',
      });
    }

    if (status === 'completed' && booking.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Can only complete ongoing bookings',
      });
    }

    booking.status = status;
    booking.updatedAt = new Date();

    if (status === 'completed' && buddy) {
      buddy.completedBookings += 1;
      await buddy.save();
    }

    if (status === 'cancelled') {
      booking.cancelledBy = isBuddy ? 'buddy' : 'user';
      booking.cancelledAt = new Date();
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: { booking },
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
    });
  }
};

// Rate and Review Booking
export const rateBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;
    const { rating, review } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to rate this booking',
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed bookings',
      });
    }

    if (booking.rating && booking.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'Booking already rated',
      });
    }

    booking.rating = {
      score: rating,
      review: review || '',
      ratedAt: new Date(),
    };
    await booking.save();

    // Update buddy rating
    const buddy = await LocalBuddy.findById(booking.buddyId);
    if (buddy) {
      const totalRating = buddy.rating.average * buddy.rating.count + rating;
      buddy.rating.count += 1;
      buddy.rating.average = totalRating / buddy.rating.count;
      await buddy.save();
    }

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      data: { booking },
    });
  } catch (error) {
    console.error('Rate booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting rating',
    });
  }
};

// Get User Booking History
export const getUserBookingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('buddyId')
        .populate('userId', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get user booking history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking history',
    });
  }
};

// Get Buddy Booking History
export const getBuddyBookingHistory = async (req, res) => {
  try {
    const buddyUserId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const buddy = await LocalBuddy.findOne({ userId: buddyUserId });
    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy profile not found',
      });
    }

    const filter = { buddyId: buddy._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('userId', 'firstName lastName profilePicture email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get buddy booking history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking history',
    });
  }
};

// Get Booking by ID
export const getBookingById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('userId', 'firstName lastName profilePicture email phone')
      .populate('buddyId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization
    const buddy = await LocalBuddy.findOne({ userId });
    const isUser = booking.userId._id.toString() === userId;
    const isBuddy = buddy && booking.buddyId._id.toString() === buddy._id.toString();

    if (!isUser && !isBuddy) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this booking',
      });
    }

    res.status(200).json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking details',
    });
  }
};

// Report Buddy
export const reportBuddy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { buddyId, bookingId, reason, description, evidence } = req.body;

    const buddy = await LocalBuddy.findById(buddyId);
    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy not found',
      });
    }

    const report = new BuddyReport({
      reportedBy: userId,
      buddyId,
      bookingId: bookingId || null,
      reason,
      description,
      evidence: evidence || [],
      status: 'pending',
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Admin will review it.',
      data: { report },
    });
  } catch (error) {
    console.error('Report buddy error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
    });
  }
};

// ==================== ADMIN FUNCTIONS ====================

// Get All Buddy Registrations
export const getAllBuddyRegistrations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [buddies, total] = await Promise.all([
      LocalBuddy.find(filter)
        .populate('userId', 'firstName lastName email profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LocalBuddy.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        buddies,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get buddy registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching buddy registrations',
    });
  }
};

// Approve/Reject Buddy Registration
export const updateBuddyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // status: 'approved' or 'rejected'

    const buddy = await LocalBuddy.findById(id).populate('userId', 'firstName lastName email');
    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy registration not found',
      });
    }

    buddy.status = status;
    if (status === 'rejected') {
      buddy.rejectionReason = rejectionReason || 'Not specified';
    } else {
      buddy.rejectionReason = null;
    }
    buddy.updatedAt = new Date();

    await buddy.save();

    // Send email notification
    try {
      await sendEmail({
        to: buddy.email,
        subject: `Buddy Registration ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        html: `<p>Hi ${buddy.buddyName},</p>
               <p>Your Local Buddy registration has been ${status === 'approved' ? 'approved' : 'rejected'}.</p>
               ${status === 'rejected' ? `<p><strong>Reason:</strong> ${rejectionReason}</p><p>You can update your registration and resubmit.</p>` : '<p>You can now start receiving booking requests!</p>'}`,
      });
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    res.status(200).json({
      success: true,
      message: `Buddy registration ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      data: { buddy },
    });
  } catch (error) {
    console.error('Update buddy status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating buddy status',
    });
  }
};

// Ban/Unban Buddy
export const banBuddy = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'ban' or 'unban'

    const buddy = await LocalBuddy.findById(id);
    if (!buddy) {
      return res.status(404).json({
        success: false,
        message: 'Buddy not found',
      });
    }

    buddy.status = action === 'ban' ? 'banned' : 'approved';
    if (action === 'ban') {
      buddy.rejectionReason = reason || 'Banned by admin';
    }
    buddy.updatedAt = new Date();

    await buddy.save();

    res.status(200).json({
      success: true,
      message: `Buddy ${action === 'ban' ? 'banned' : 'unbanned'} successfully`,
      data: { buddy },
    });
  } catch (error) {
    console.error('Ban buddy error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating buddy status',
    });
  }
};

// Get All Bookings (Admin)
export const getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('userId', 'firstName lastName email profilePicture')
        .populate('buddyId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
    });
  }
};

// Get All Reports
export const getAllReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      BuddyReport.find(filter)
        .populate('reportedBy', 'firstName lastName email profilePicture')
        .populate('buddyId')
        .populate('bookingId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BuddyReport.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
    });
  }
};

// Update Report Status
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, actionTaken } = req.body;

    const report = await BuddyReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    report.status = status;
    report.adminNotes = adminNotes || report.adminNotes;
    report.actionTaken = actionTaken || report.actionTaken;
    
    if (status === 'resolved') {
      report.resolvedBy = req.user.id;
      report.resolvedAt = new Date();
    }

    report.updatedAt = new Date();
    await report.save();

    // If action is ban, update buddy status
    if (actionTaken === 'temporary_ban' || actionTaken === 'permanent_ban') {
      const buddy = await LocalBuddy.findById(report.buddyId);
      if (buddy) {
        buddy.status = 'banned';
        buddy.rejectionReason = `Banned due to report: ${report.reason}`;
        await buddy.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: { report },
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report',
    });
  }
};

// Get Buddy Statistics (Admin)
export const getBuddyStatistics = async (req, res) => {
  try {
    const [
      totalBuddies,
      pendingBuddies,
      approvedBuddies,
      rejectedBuddies,
      bannedBuddies,
      totalBookings,
      completedBookings,
      pendingReports,
    ] = await Promise.all([
      LocalBuddy.countDocuments(),
      LocalBuddy.countDocuments({ status: 'pending' }),
      LocalBuddy.countDocuments({ status: 'approved' }),
      LocalBuddy.countDocuments({ status: 'rejected' }),
      LocalBuddy.countDocuments({ status: 'banned' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      BuddyReport.countDocuments({ status: 'pending' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBuddies,
        pendingBuddies,
        approvedBuddies,
        rejectedBuddies,
        bannedBuddies,
        totalBookings,
        completedBookings,
        pendingReports,
      },
    });
  } catch (error) {
    console.error('Get buddy statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
    });
  }
};
