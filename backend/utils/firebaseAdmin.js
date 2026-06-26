import jwt from 'jsonwebtoken';

let cachedPublicKeys = null;
let cacheExpiry = 0;

// Fetch Google's public certificates and cache them in-memory
const getGooglePublicKeys = async () => {
  const now = Date.now();
  if (cachedPublicKeys && now < cacheExpiry) {
    return cachedPublicKeys;
  }

  try {
    const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    if (!res.ok) {
      throw new Error(`Failed to fetch Google public keys: ${res.statusText}`);
    }
    const keys = await res.json();
    cachedPublicKeys = keys;
    // Cache for 1 hour
    cacheExpiry = now + 3600 * 1000;
    return keys;
  } catch (err) {
    if (cachedPublicKeys) {
      // Fallback to stale cache if request fails
      return cachedPublicKeys;
    }
    throw err;
  }
};

/**
 * Cryptographically verifies a Firebase ID Token (RS256 JWT)
 * @param {string} token The Firebase ID Token sent by the client
 * @returns {Promise<object>} The decoded token claims (e.g. uid, phone_number)
 */
export const verifyFirebaseToken = async (token) => {
  if (!token) {
    throw new Error('ID Token is required');
  }

  // Decode the token header to check the Key ID (kid)
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('Invalid token structure');
  }

  const kid = decoded.header.kid;
  const publicKeys = await getGooglePublicKeys();
  const cert = publicKeys[kid];

  if (!cert) {
    throw new Error('Firebase ID Token signature verification failed (unknown kid)');
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'colourplay-5385d';

  // Verify the JWT signature and claims
  const verifiedClaims = jwt.verify(token, cert, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`
  });

  return verifiedClaims;
};
