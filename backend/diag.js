import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runDiagnostics() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || 'Kumar870@',
    database: process.env.MYSQL_DATABASE || 'colourplay'
  });
  
  try {
    console.log('=== PLATFORM REFERRAL DIAGNOSTICS ===');
    
    // 1. Check Admin User (UID: 102950)
    const [admins] = await connection.query('SELECT id, uid, name, phone, role FROM users WHERE uid = "102950"');
    console.log('\n1. Admin account with invite code 102950:');
    if (admins.length > 0) {
      console.log(admins[0]);
    } else {
      console.log('ERROR: No user found with UID 102950!');
    }

    // 2. Check 5 most recent users
    const [recentUsers] = await connection.query('SELECT id, uid, name, phone, created_at FROM users ORDER BY id DESC LIMIT 5');
    console.log('\n2. 5 most recently registered users:');
    console.log(recentUsers);

    // 3. Check 5 most recent referrals
    const [recentReferrals] = await connection.query(
      'SELECT r.*, u1.uid as referrer_uid, u1.name as referrer_name, u2.name as referred_name ' +
      'FROM referrals r ' +
      'LEFT JOIN users u1 ON r.referrer_id = u1.id ' +
      'LEFT JOIN users u2 ON r.referred_id = u2.id ' +
      'ORDER BY r.id DESC LIMIT 5'
    );
    console.log('\n3. 5 most recent referral relationships:');
    console.log(recentReferrals);
    
  } catch (err) {
    console.error('Diagnostics failed:', err);
  } finally {
    await connection.end();
  }
}

runDiagnostics();
