import bcrypt from 'bcryptjs';
import { User } from '../models/User';

export async function seedDefaultUsers(): Promise<void> {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      return;
    }

    console.log('[Seed] No existing users found. Seeding default accounts...');

    const salt = await bcrypt.genSalt(12);

    const investigatorPasswordHash = await bcrypt.hash('investigator123', salt);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);

    await User.create([
      {
        username: 'sarah.investigator',
        email: 'investigator@fraudlens.internal',
        passwordHash: investigatorPasswordHash,
        fullName: 'Sarah Chen, CAMS',
        role: 'investigator',
        isActive: true,
      },
      {
        username: 'alex.admin',
        email: 'admin@fraudlens.internal',
        passwordHash: adminPasswordHash,
        fullName: 'Alex Rivera (Compliance Admin)',
        role: 'admin',
        isActive: true,
      },
    ]);

    console.log('[Seed] Default users seeded successfully:');
    console.log('  → investigator@fraudlens.internal (password: investigator123)');
    console.log('  → admin@fraudlens.internal (password: admin123)');
  } catch (error) {
    console.error('[Seed] Error seeding default users:', error);
  }
}
