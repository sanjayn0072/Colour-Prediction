import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;
  
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.cookies && req.cookies.Authorization) {
    const authCookie = req.cookies.Authorization;
    token = authCookie.startsWith('Bearer ') ? authCookie.split(' ')[1] : authCookie;
  }
  
  if (!token || token === 'null' || token === 'undefined') {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
  }
  
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query(
      'SELECT u.id, u.uid, u.name, u.phone, u.email, u.role, u.status, u.profile_pic, w.balance as available_balance, w.locked_balance ' +
      'FROM users u ' +
      'JOIN wallets w ON u.id = w.user_id ' +
      'WHERE u.id = ?',
      [decoded.id]
    );
    
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'User not found in system' });
    }
    
    req.user = users[0];

    if (req.user && req.user.status && req.user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended/locked.' });
    }

    req.adminVerified = !!decoded.adminVerified;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
};

