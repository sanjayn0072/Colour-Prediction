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

  // 1. Authentication, Login & Session Errors
  if (errLower.includes('invalid credentials') || 
      errLower.includes('email or password') || 
      errLower.includes('password mismatch') || 
      errLower.includes('invalid admin credentials') ||
      errLower.includes('does not match our records') ||
      errLower.includes('doesn\'t match our records') ||
      errLower.includes('phone number or password you entered')) {
    return "Invalid email/phone number or password.";
  }

  if (errLower.includes('user not found') || 
      errLower.includes('account not found') || 
      errLower.includes('admin account not found') ||
      errLower.includes('couldn\'t find an account matching')) {
    return "We couldn't find an account matching those details. Please sign up or check your spelling.";
  }

  if (errLower.includes('phone number already registered') || 
      errLower.includes('already exists') || 
      errLower.includes('already registered') || 
      errLower.includes('er_dup_entry')) {
    return "This phone number is already registered. Please sign in instead.";
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
    return "Your account is temporarily locked. Please reach out to support for assistance.";
  }

  // 2. Forgot Password / Verification OTP Errors
  if (errLower.includes('couldn\'t find a mobile number') || 
      errLower.includes('no mobile number linked')) {
    return "No mobile number is linked to this account.";
  }

  if (errLower.includes('unable to deliver') || 
      errLower.includes('gateway execution failure') || 
      errLower.includes('sms gateway error')) {
    return "SMS delivery failed. Please verify your phone number and try again.";
  }

  if (errLower.includes('invalid or expired otp') || 
      errLower.includes('invalid or expired verification code') || 
      errLower.includes('otp code you entered is invalid') || 
      errLower.includes('code you entered is invalid')) {
    return "The verification code you entered is invalid or has expired.";
  }

  // 3. Register Page Inputs
  if (errLower.includes('name must be at least 2') || 
      errLower.includes('name cannot exceed')) {
    return "Name must be between 2 and 50 characters long.";
  }

  if (errLower.includes('name can only contain alphabetic') || 
      errLower.includes('alphabetic characters and spaces')) {
    return "Name can only contain alphabetic characters and spaces.";
  }

  if (errLower.includes('phone number must be a valid') || 
      errLower.includes('enter a valid 10-digit phone number')) {
    return "Please enter a valid 10-digit phone number.";
  }

  if (errLower.includes('password must be at least 6') || 
      errLower.includes('passwords do not match')) {
    if (errLower.includes('passwords do not match')) {
      return "Passwords do not match.";
    }
    return "Password must be at least 6 characters long.";
  }

  if (errLower.includes('otp must be exactly 6') || 
      zodFieldMatch(errLower, 'otp')) {
    return "Please enter the complete 6-digit verification code.";
  }

  if (errLower.includes('invalid invite code') || 
      errLower.includes('invite code format')) {
    return "The referral code format is invalid. Please check and try again.";
  }

  // 4. Product Buy / Store Errors
  if (errLower.includes('out of stock')) {
    return "This product is currently out of stock.";
  }

  if (errLower.includes('product not found')) {
    return "The requested product was not found.";
  }

  if (errLower.includes('insufficient balance') || 
      errLower.includes('negative available balance') || 
      errLower.includes('negative bonus balance') ||
      errLower.includes('deduction results in negative')) {
    return "Your wallet balance is insufficient for this transaction.";
  }

  // 5. Deposit Errors
  if (errLower.includes('minimum deposit') || 
      errLower.includes('deposit amount must be at least') ||
      errLower.includes('minimum deposit is')) {
    return "Minimum deposit amount is ₹100.";
  }

  if (errLower.includes('proof') || 
      errLower.includes('screenshot') || 
      errLower.includes('screenshot_url') ||
      errLower.includes('screenshot is required')) {
    return "Please upload a valid payment proof screenshot.";
  }

  // 6. Withdrawal Errors
  if (errLower.includes('minimum withdrawal') || 
      errLower.includes('withdrawal amount must be')) {
    return "Minimum withdrawal amount is ₹100.00.";
  }

  if (errLower.includes('already have a pending withdrawal')) {
    return "You already have a pending withdrawal request in progress.";
  }

  if (errLower.includes('vip 0 users') || 
      errLower.includes('tier withdrawal limit')) {
    return "VIP 0 accounts have restricted withdrawal limits. Please deposit to upgrade your VIP tier.";
  }

  // 7. Appeal Errors
  if (errLower.includes('appeal') || 
      errLower.includes('appeal not found') || 
      errLower.includes('appeal already resolved') ||
      errLower.includes('already resolved')) {
    return "This deposit appeal has already been resolved or does not exist.";
  }

  // 8. Game Errors
  if (errLower.includes('betting closed') || 
      errLower.includes('betting closed for this round')) {
    return "Betting is closed for the current round. Please wait for the next round to start.";
  }

  if (errLower.includes('do not have any lucky spins') || 
      errLower.includes('no lucky spins remaining')) {
    return "You do not have any lucky spins remaining. Top up ₹200 or more to get more spins!";
  }

  // General field validation helper
  if (errLower.includes('email address') || errLower.includes('invalid email')) {
    return "Please enter a valid email address.";
  }

  if (errLower.includes('required fields') || errLower.includes('please fill in all fields')) {
    return "Please fill in all the required fields.";
  }

  // Default fallback
  return "We encountered an unexpected issue. Please wait a moment and try again.";
};

// Helper for quick field checking
const zodFieldMatch = (str, fieldName) => {
  return str.includes(fieldName) && (str.includes('required') || str.includes('invalid') || str.includes('character'));
};
