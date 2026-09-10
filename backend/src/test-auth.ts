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

  // Disconnect cleanly
  await disconnectDatabase();
  console.log('\n--- ALL PHASE 2 AUTH TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runAuthTests().catch(async (err) => {
  console.error('\n❌ AUTH TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
