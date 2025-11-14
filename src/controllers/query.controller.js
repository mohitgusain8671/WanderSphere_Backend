import Query from '#models/query.model.js';
import User from '#models/users.model.js';
import { sendEmail } from '#services/email.service.js';

// User: Create Query
export const createQuery = async (req, res) => {
  try {
    const { type, subject, description, priority } = req.body;
    const userId = req.user.id;

    if (!type || !subject || !description) {
      return res.status(400).json({ 
        success: false,
        message: 'Type, subject, and description are required' 
      });
    }

    const query = new Query({
      userId,
      type,
      subject,
      description,
      priority: priority || 'medium',
    });

    await query.save();

    // Populate user info
    await query.populate('userId', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Query submitted successfully',
      data: { query },
    });
  } catch (error) {
    console.error('Create query error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating query' 
    });
  }
};

// User: Get My Queries
export const getMyQueries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [queries, total] = await Promise.all([
      Query.find({ userId })
        .populate('adminResponse.respondedBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Query.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        queries,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get my queries error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching queries' 
    });
  }
};

// User: Get Single Query
export const getQueryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = await Query.findOne({ _id: id, userId })
      .populate('userId', 'firstName lastName email')
      .populate('adminResponse.respondedBy', 'firstName lastName');

    if (!query) {
      return res.status(404).json({ 
        success: false,
        message: 'Query not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: { query },
    });
  } catch (error) {
    console.error('Get query by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching query' 
    });
  }
};

// Admin: Get All Queries
export const getAllQueries = async (req, res) => {
  try {
    const { 
      status, 
      type, 
      priority,
      search,
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      page = 1, 
      limit = 20 
    } = req.query;

    const filter = {};
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [queries, total] = await Promise.all([
      Query.find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('adminResponse.respondedBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Query.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        queries,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all queries error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching queries' 
    });
  }
};

// Admin: Update Query Status
export const updateQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;
    const adminId = req.user.id;

    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'Status is required' 
      });
    }

    const query = await Query.findById(id).populate('userId', 'firstName email');
    
    if (!query) {
      return res.status(404).json({ 
        success: false,
        message: 'Query not found' 
      });
    }

    const oldStatus = query.status;
    query.status = status;
    query.adminResponse = {
      message: message || '',
      respondedBy: adminId,
      respondedAt: new Date(),
    };
    query.updatedAt = new Date();

    await query.save();

    // Send email notification to user
    try {
      const statusText = {
        pending: 'Pending',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        rejected: 'Rejected',
      };

      await sendEmail({
        to: query.userId.email,
        subject: `Query Status Updated: ${statusText[status]}`,
        html: `
          <h2>Query Status Update</h2>
          <p>Hi ${query.userId.firstName},</p>
          <p>Your query status has been updated.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Subject:</strong> ${query.subject}</p>
            <p><strong>Previous Status:</strong> ${statusText[oldStatus]}</p>
            <p><strong>New Status:</strong> ${statusText[status]}</p>
            ${message ? `<p><strong>Admin Response:</strong><br>${message}</p>` : ''}
          </div>
          
          <p>You can view your query details in the app.</p>
          <p>Thank you for your patience!</p>
        `,
      });
    } catch (emailError) {
      console.error('Query status email error:', emailError);
    }

    await query.populate('adminResponse.respondedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Query status updated successfully',
      data: { query },
    });
  } catch (error) {
    console.error('Update query status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating query status' 
    });
  }
};

// Admin: Get Query Statistics
export const getQueryStatistics = async (req, res) => {
  try {
    const [
      totalQueries,
      pendingQueries,
      inProgressQueries,
      resolvedQueries,
      rejectedQueries,
      queriesByType,
    ] = await Promise.all([
      Query.countDocuments(),
      Query.countDocuments({ status: 'pending' }),
      Query.countDocuments({ status: 'in_progress' }),
      Query.countDocuments({ status: 'resolved' }),
      Query.countDocuments({ status: 'rejected' }),
      Query.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalQueries,
        pending: pendingQueries,
        inProgress: inProgressQueries,
        resolved: resolvedQueries,
        rejected: rejectedQueries,
        byType: queriesByType,
      },
    });
  } catch (error) {
    console.error('Get query statistics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching query statistics' 
    });
  }
};
