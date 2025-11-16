import mongoose from 'mongoose';

const buddyReportSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  buddyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LocalBuddy',
    required: true,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'Unprofessional Behavior',
      'Fraud/Scam',
      'No Show',
      'Overcharging',
      'Safety Concerns',
      'Harassment',
      'Poor Service',
      'Other',
    ],
  },
  description: {
    type: String,
    required: true,
    maxLength: 1000,
  },
  evidence: [{
    type: String, // URLs to uploaded evidence
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'dismissed'],
    default: 'pending',
  },
  adminNotes: {
    type: String,
    maxLength: 1000,
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'temporary_ban', 'permanent_ban'],
    default: 'none',
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
buddyReportSchema.index({ buddyId: 1 });
buddyReportSchema.index({ reportedBy: 1 });
buddyReportSchema.index({ status: 1 });
buddyReportSchema.index({ createdAt: -1 });

const BuddyReport = mongoose.model('BuddyReport', buddyReportSchema);
export default BuddyReport;
