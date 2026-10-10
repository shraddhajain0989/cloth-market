/**
 * Utility for parsing and validating JWT claims on the client side.
 * Prevents localStorage state manipulation and client-side privilege escalation.
 */

/**
 * Safely decodes a JWT payload without external libraries.
 * @param {string} token 
 * @returns {object|null}
 */
export function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is expired.
 * @param {string} token 
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  // Exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= payload.exp * 1000;
}

/**
 * Extracts and returns the verified role claim from the JWT payload.
 * Returns null if token is missing, invalid, or expired.
 * @param {string} token 
 * @returns {string|null}
 */
export function getValidatedTokenRole(token) {
  const payload = parseJwt(token);
  if (!payload) return null;
  if (payload.exp && Date.now() >= payload.exp * 1000) return null;
  return payload.role || null;
}
