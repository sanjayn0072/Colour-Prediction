import crypto from 'crypto';

/**
 * Generates a secure, random 32-byte server seed in hex format.
 */
export const generateServerSeed = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hashes a seed using SHA-256 to create a public commitment.
 */
export const hashSeed = (seed) => {
  return crypto.createHash('sha256').update(seed).digest('hex');
};

/**
 * Calculates a provably fair outcome (0.00 to 100.00) using HMAC-SHA512.
 * @param {string} serverSeed The secret server seed
 * @param {string} clientSeed The player-provided or public client seed
 * @param {number} nonce The round/tick count
 */
export const generateOutcome = (serverSeed, clientSeed, nonce) => {
  const hash = crypto
    .createHmac('sha512', serverSeed)
    .update(`${clientSeed}-${nonce}`)
    .digest('hex');
  
  // Extract first 8 characters of the hash (4 bytes) and convert to integer
  const intVal = parseInt(hash.substring(0, 8), 16);
  
  // Scale integer value to a range of 0.00 - 100.00 (modulo 10001 divided by 100)
  const outcome = parseFloat(((intVal % 10001) / 100).toFixed(2));
  return outcome;
};
