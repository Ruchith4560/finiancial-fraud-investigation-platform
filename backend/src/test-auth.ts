import { connectDatabase, disconnectDatabase } from './config/database';
import { seedDefaultUsers } from './utils/seedUsers';
import { AuthService } from './services/authService';
import { verifyToken } from './utils/jwt';

async function runAuthTests() {
  console.log('--- STARTING PHASE 2 AUTHENTICATION INTEGRATION TESTS ---');

  // 1. Connect & Seed
  await connectDatabase();
  await seedDefaultUsers();

  // 2. Test valid login
  console.log('\n[Test 1] Testing login with valid investigator credentials...');
  const result = await AuthService.login({
    email: 'investigator@fraudlens.internal',
    password: 'investigator123',
  });

  if (!result.token) throw new Error('Token was not issued');
  if (result.user.email !== 'investigator@fraudlens.internal') throw new Error('Email mismatch');
  if (result.user.role !== 'investigator') throw new Error('Role mismatch');
  if ((result.user.toJSON() as any).passwordHash) throw new Error('Security flaw: passwordHash leaked in toJSON');
  console.log('✓ Test 1 Passed: Valid login issued signed JWT and sanitized user profile.');

  // 3. Test invalid credentials
  console.log('\n[Test 2] Testing login with invalid password...');
  try {
    await AuthService.login({
      email: 'investigator@fraudlens.internal',
      password: 'wrong_password_999',
    });
    throw new Error('Security flaw: Invalid password did not trigger authentication error');
  } catch (err: any) {
    if (err.code === 'INVALID_CREDENTIALS') {
      console.log('✓ Test 2 Passed: Invalid password rejected with 401 INVALID_CREDENTIALS.');
    } else {
      throw err;
    }
  }

  // 4. Test Token Decoding & Payload Integrity
  console.log('\n[Test 3] Testing JWT signature and payload integrity...');
  const decoded = verifyToken(result.token);
  if (decoded.email !== 'investigator@fraudlens.internal') throw new Error('JWT email tampered');
  if (decoded.role !== 'investigator') throw new Error('JWT role tampered');
  console.log(`✓ Test 3 Passed: JWT verified. Subject: ${decoded.fullName} (${decoded.role}).`);

  // 5. Test Admin User Login
  console.log('\n[Test 4] Testing admin credentials...');
  const adminResult = await AuthService.login({
    email: 'admin@fraudlens.internal',
    password: 'admin123',
  });
  if (adminResult.user.role !== 'admin') throw new Error('Admin role mismatch');
  console.log('✓ Test 4 Passed: Admin user authenticated successfully with admin role.');

  // 6. Test Registration for Investigator
  console.log('\n[Test 5] Testing registration for new investigator...');
  const newInvestigator = await AuthService.register({
    fullName: 'Jane Investigator',
    username: 'jane_inv',
    email: 'jane.inv@fraudlens.internal',
    password: 'securePassword123!',
    role: 'investigator',
  });
  if (!newInvestigator.token) throw new Error('Registration did not issue token');
  if (newInvestigator.user.role !== 'investigator') throw new Error('Role mismatch on registration');
  console.log(`✓ Test 5 Passed: Successfully registered investigator '${newInvestigator.user.fullName}' with JWT.`);

  // 7. Test Registration for Admin
  console.log('\n[Test 6] Testing registration for new admin...');
  const newAdmin = await AuthService.register({
    fullName: 'Alex Administrator',
    username: 'alex_adm',
    email: 'alex.adm@fraudlens.internal',
    password: 'secureAdminPass123!',
    role: 'admin',
  });
  if (!newAdmin.token) throw new Error('Admin registration did not issue token');
  if (newAdmin.user.role !== 'admin') throw new Error('Role mismatch on admin registration');
  console.log(`✓ Test 6 Passed: Successfully registered admin '${newAdmin.user.fullName}' with JWT.`);

  // Disconnect cleanly
  await disconnectDatabase();
  console.log('\n--- ALL AUTH INTEGRATION TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runAuthTests().catch(async (err) => {
  console.error('\n❌ AUTH TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
