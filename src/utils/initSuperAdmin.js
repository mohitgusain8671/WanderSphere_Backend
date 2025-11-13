import User from '../models/users.model.js';
import bcrypt from 'bcrypt';

export const initializeSuperAdmin = async () => {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log('✅ Super Admin already exists');
      return;
    }

    // Create default super admin from environment variables or defaults
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@travelconnect.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
    const superAdminFirstName = process.env.SUPER_ADMIN_FIRSTNAME || 'Super';
    const superAdminLastName = process.env.SUPER_ADMIN_LASTNAME || 'Admin';

    // Check if user with this email exists
    const existingUser = await User.findOne({ email: superAdminEmail });
    
    if (existingUser) {
      // Update existing user to super_admin
      existingUser.role = 'super_admin';
      existingUser.permissions = [];
      existingUser.isVerified = true;
      await existingUser.save();
      console.log('✅ Existing user upgraded to Super Admin');
      console.log(`📧 Super Admin Email: ${superAdminEmail}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    // Create super admin
    const superAdmin = new User({
      firstName: superAdminFirstName,
      lastName: superAdminLastName,
      email: superAdminEmail,
      password: hashedPassword,
      role: 'super_admin',
      permissions: [],
      isVerified: true,
      bio: 'System Super Administrator',
    });

    await superAdmin.save();

    console.log('✅ Super Admin created successfully');
    console.log(`📧 Email: ${superAdminEmail}`);
    console.log(`🔑 Password: ${superAdminPassword}`);
    console.log('⚠️  Please change the default password after first login!');
  } catch (error) {
    console.error('❌ Error initializing Super Admin:', error);
  }
};
