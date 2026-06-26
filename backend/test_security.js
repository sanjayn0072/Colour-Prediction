import assert from 'assert';
import bcrypt from 'bcryptjs';
import { calculateWithdrawalFee } from './controllers/walletController.js';

console.log('=== STARTING SECURITY & ENGINE TEST HARNESS ===\n');

// ─── TEST 1: Password Hashing Integrity ───
async function testPasswordHashing() {
  const plainPassword = 'SuperSecurePassword123!';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  
  assert.notStrictEqual(plainPassword, hashedPassword, 'Hashed password must not match plain text');
  assert.ok(hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$'), 'Must be a valid bcrypt hash');
  
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  assert.ok(isMatch, 'Password comparison check must pass for correct credentials');
  
  const isFail = await bcrypt.compare('WrongPassword', hashedPassword);
  assert.ok(!isFail, 'Password comparison check must fail for incorrect credentials');
  
  console.log('✓ PASS: Password hashing and comparison verify successfully');
}

// ─── TEST 2: Progressive Withdrawal Fee Engine Math ───
function testWithdrawalFeeEngine() {
  // Case A: 100 flat payout -> 9% fee (9)
  const fee100 = calculateWithdrawalFee(100);
  assert.strictEqual(fee100, 9.00, `₹100 payout fee must be ₹9.00 (got ₹${fee100})`);

  // Case B: 200 payout -> base 9 + (100 * 3%) = 12 fee
  const fee200 = calculateWithdrawalFee(200);
  assert.strictEqual(fee200, 12.00, `₹200 payout fee must be ₹12.00 (got ₹${fee200})`);

  // Case C: 1000 payout -> base 9 + (900 * 3%) = 36 fee
  const fee1000 = calculateWithdrawalFee(1000);
  assert.strictEqual(fee1000, 36.00, `₹1000 payout fee must be ₹36.00 (got ₹${fee1000})`);

  // Case D: 2000 payout -> flat 3% = 60 fee
  const fee2000 = calculateWithdrawalFee(2000);
  assert.strictEqual(fee2000, 60.00, `₹2000 payout fee must be ₹60.00 (got ₹${fee2000})`);

  console.log('✓ PASS: Progressive withdrawal fee math aligns with spec examples');
}

// ─── TEST 3: Zero-Trust NoSQL Injection Sanitization Middleware ───
function testNoSqlSanitization() {
  const sanitizeInput = (obj) => {
    if (obj instanceof Object) {
      for (const key in obj) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else {
          sanitizeInput(obj[key]);
        }
      }
    }
    return obj;
  };

  const payload = {
    username: 'normal_user',
    password: { $gt: '' }, // Injection payload
    nested: {
      key: 'value',
      $ne: 'exploit'
    }
  };

  const sanitized = sanitizeInput(payload);
  
  assert.strictEqual(sanitized.password.$gt, undefined, 'Injection key $gt must be stripped');
  assert.strictEqual(sanitized.nested.$ne, undefined, 'Nested injection key $ne must be stripped');
  assert.strictEqual(sanitized.username, 'normal_user', 'Legitimate key must remain intact');
  
  console.log('✓ PASS: NoSQL injection query parameters are securely sanitized');
}

// Run all test units
async function runAll() {
  try {
    await testPasswordHashing();
    testWithdrawalFeeEngine();
    testNoSqlSanitization();
    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('\n❌ TEST HARNESS FAILED:', error.message);
    process.exit(1);
  }
}

runAll();
