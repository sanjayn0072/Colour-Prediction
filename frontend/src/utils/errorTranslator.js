/**
 * Frontend human-friendly error translation lookup map.
 * Converts backend low-level technical strings into polished, professional,
 * and grammatically correct American English error messages.
 */
export const translateError = (errorString) => {
  if (!errorString || typeof errorString !== 'string') {
    return "We are experiencing slightly higher traffic than usual. Please wait a moment and try again.";
  }

  const errLower = errorString.toLowerCase();

  // Authentication & Session
  if (errLower.includes('invalid credentials') || 
      errLower.includes('email or password') || 
      errLower.includes('password mismatch') || 
      errLower.includes('invalid admin credentials')) {
    return "The phone number or password you entered doesn't match our records. Please double-check your entries and try again.";
  }

  if (errLower.includes('user not found') || 
      errLower.includes('account not found') || 
      errLower.includes('admin account not found')) {
    return "We couldn't find an account matching those details. Please register or contact support for help.";
  }

  if (errLower.includes('phone number already registered') || 
      errLower.includes('already exists') || 
      errLower.includes('already registered') || 
      errLower.includes('er_dup_entry')) {
    return "This phone number is already linked to an account. Please sign in or try registering with a different number.";
  }

  if (errLower.includes('not authorized') || 
      errLower.includes('token missing') || 
      errLower.includes('token invalid') || 
      errLower.includes('jwt expired') || 
      errLower.includes('unauthorized') || 
      errLower.includes('authentication required') || 
      errLower.includes('token has expired') || 
      errLower.includes('temporary token has expired')) {
    return "Your session has expired. Please sign in again to continue.";
  }

  if (errLower.includes('account is suspended') || 
      errLower.includes('account suspended') || 
      errLower.includes('suspended or inactive') || 
      errLower.includes('suspended or locked') || 
      errLower.includes('account is suspended/locked')) {
    return "Your account is temporarily locked. Please reach out to our support team for assistance.";
  }

  // 2FA / Security
  if (errLower.includes('two-factor authentication') || 
      errLower.includes('totp verification code') || 
      errLower.includes('verification code and temporary token') || 
      errLower.includes('google authenticator verification code')) {
    return "Please enter the 6-digit verification code from your Google Authenticator app to proceed.";
  }

  if (errLower.includes('invalid authentication code') || 
      errLower.includes('invalid google authenticator code') || 
      errLower.includes('invalid or expired 2fa code') || 
      errLower.includes('incorrect 2fa code')) {
    return "The verification code you entered is incorrect or has expired. Please check your authenticator app and try again.";
  }

  if (errLower.includes('2fa secret') || errLower.includes('2fa is not configured')) {
    return "Two-factor authentication setup is required. Please enable 2FA in your security settings to proceed.";
  }

  // Server, Network & Gateway
  if (errLower.includes('temporarily unavailable') || errLower.includes('gateway is temporarily offline') || errLower.includes('unseeded')) {
    return "The payment gateway is temporarily offline for maintenance. Please try again shortly or reach out to support.";
  }

  if (errLower.includes('internal server error') || 
      errLower.includes('database query failed') || 
      errLower.includes('database transaction failure') ||
      errLower.includes('unhandled express error') ||
      errLower.includes('core game engine')) {
    return "The server encountered an unexpected error. Please try again shortly or contact support if the issue persists.";
  }

  if (errLower.includes('network error') || 
      errLower.includes('failed to fetch') || 
      errLower.includes('server connection issues') || 
      errLower.includes('connection error') || 
      errLower.includes('gateway error') || 
      errLower.includes('failed to retrieve') || 
      errLower.includes('failed to verify')) {
    return "We are having trouble communicating with our servers. Please check your internet connection and try again.";
  }

  if (errLower.includes('too many attempts') || 
      errLower.includes('too many requests') || 
      errLower.includes('too many authentication attempts') || 
      errLower.includes('too many wallet operations') || 
      errLower.includes('rate limit')) {
    return "We have received too many requests in a short time. Please take a brief moment and try again shortly.";
  }

  // Form inputs & fields
  if (errLower.includes('all fields are required') || 
      errLower.includes('missing required fields') || 
      errLower.includes('subject and description are required') || 
      errLower.includes('code, discounttype and valid value are required')) {
    return "Please fill in all the required fields before submitting.";
  }

  if (errLower.includes('invalid phone format') || 
      errLower.includes('phone number must be a valid format')) {
    return "Please enter a valid 10-digit phone number.";
  }

  if (errLower.includes('invalid otp format') || 
      errLower.includes('otp must be exactly 6 digits')) {
    return "Please enter the complete 6-digit verification code sent to your mobile number.";
  }

  if (errLower.includes('password must be at least 6 characters')) {
    return "For your security, passwords must be at least 6 characters long.";
  }

  if (errLower.includes('invalid email address') || errLower.includes('invalid email')) {
    return "Please enter a valid email address.";
  }

  // Wallet & Financials
  if (errLower.includes('insufficient balance') || 
      errLower.includes('negative available balance') || 
      errLower.includes('negative bonus balance')) {
    return "Your account balance is insufficient for this action. Please add funds to your wallet to continue.";
  }

  if (errLower.includes('minimum withdrawal') || 
      errLower.includes('maximum withdrawal') || 
      errLower.includes('withdrawal amount must be between')) {
    return "Withdrawal amounts must be between ₹100 and ₹5,000. Please adjust your request and try again.";
  }

  if (errLower.includes('already have a pending withdrawal')) {
    return "You already have a pending withdrawal request. Please wait until your current request is processed.";
  }

  if (errLower.includes('vip 0 users can only withdraw') || errLower.includes('vip 0 users')) {
    return "VIP Tier 1 or higher is required to request withdrawals above ₹2,000. Please complete a deposit to upgrade your tier.";
  }

  if (errLower.includes('tier withdrawal limit reached') || errLower.includes('withdrawal limit reached')) {
    return "You have reached the withdrawal limit for your current VIP tier. Please upgrade your VIP level to unlock higher limits.";
  }

  // Orders, Store & Products
  if (errLower.includes('invalid order status') || errLower.includes('order not found')) {
    return "We couldn't locate this order or update its status. Please refresh the page and try again.";
  }

  if (errLower.includes('invalid complaint status') || errLower.includes('complaint not found')) {
    return "We couldn't locate this support ticket or update its status. Please refresh the page and try again.";
  }

  if (errLower.includes('coupon not found') || errLower.includes('coupon already used') || errLower.includes('coupon deleted')) {
    return "This promo code is invalid or has already been used.";
  }

  if (errLower.includes('product is out of stock')) {
    return "This item is currently out of stock. Please check back later.";
  }

  if (errLower.includes('product not found')) {
    return "We couldn't find the requested product. It may have been updated or removed.";
  }

  // Game specific
  if (errLower.includes('betting closed') || errLower.includes('betting closed for this round')) {
    return "Betting is closed for the current round. Please wait a moment for the next round to begin.";
  }

  if (errLower.includes('do not have any lucky spins remaining') || errLower.includes('no lucky spins')) {
    return "You do not have any lucky spins remaining. Top up your wallet with ₹200 or more to earn additional spins!";
  }

  // File uploads
  if (errLower.includes('invalid file type') || errLower.includes('only png, jpeg, and webp')) {
    return "Invalid file type. Please upload a valid image file in PNG, JPEG, or WEBP format.";
  }

  // Default fallback
  return "We encountered an unexpected issue. Please wait a moment and try again.";
};
