import User from '#models/users.model.js';

// Check if user is admin or super_admin
export const checkAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Server error during admin verification' });
  }
};

// Check if user is super_admin
export const checkSuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Access denied. Super Admin privileges required.' 
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ message: 'Server error during super admin verification' });
  }
};

// Check if user has specific permission
export const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.adminUser || await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        req.adminUser = user;
        return next();
      }

      // Check if admin has the required permission
      if (!user.permissions || !user.permissions.includes(permission)) {
        return res.status(403).json({ 
          message: `Access denied. ${permission} permission required.` 
        });
      }

      req.adminUser = user;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Server error during permission verification' });
    }
  };
};
