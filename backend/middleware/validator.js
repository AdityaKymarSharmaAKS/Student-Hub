/**
 * F-TECH-Student-Hub Security Validation Middleware
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

// Strict RFC 5322 compatible regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Name regex: Letters, spaces, apostrophes, and dots (2 to 60 chars)
const NAME_REGEX = /^[a-zA-Z\s.']{2,60}$/;

// Blocked dummy/garbage email patterns
const BLOCKED_DUMMY_PATTERNS = [
  /^.+@b$/,
  /^.+@a$/,
  /^.+@x$/,
  /^.+@y$/,
  /^.+@1$/,
  /^.+@.+@.+$/,
  /^[a-zA-Z0-9]@.+$/,
  /^test@test/i,
  /^admin@admin/i,
  /^a@.+/i
];

function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, message: 'Email address is required.' };
  
  const clean = email.trim().toLowerCase();
  
  if (clean.length < 6 || clean.length > 254) {
    return { valid: false, message: 'Email address length must be between 6 and 254 characters.' };
  }

  if (!EMAIL_REGEX.test(clean)) {
    return { valid: false, message: 'Please enter a valid, complete email address (e.g. name@college.edu or name@gmail.com).' };
  }

  // Verify domain structure
  const parts = clean.split('@');
  if (parts.length !== 2) {
    return { valid: false, message: 'Invalid email structure.' };
  }

  const domain = parts[1];
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { valid: false, message: 'Email domain must have a valid extension (e.g. .edu, .ac.in, .com).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return { valid: false, message: 'Email domain extension must be at least 2 alphabetic characters.' };
  }

  // Check against dummy patterns
  for (const pattern of BLOCKED_DUMMY_PATTERNS) {
    if (pattern.test(clean)) {
      return { valid: false, message: 'Dummy or placeholder emails (like single letters or @b) are prohibited. Please use a real email.' };
    }
  }

  return { valid: true, cleanEmail: clean };
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }

  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }

  if (password.length > 72) {
    return { valid: false, message: 'Password cannot exceed 72 characters.' };
  }

  // Require at least one letter and at least one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain at least one letter and one number for security.' };
  }

  return { valid: true };
}

function validateFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, message: 'Full name is required.' };
  }

  const trimmed = fullName.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { valid: false, message: 'Full name must be between 2 and 60 characters.' };
  }

  if (!NAME_REGEX.test(trimmed)) {
    return { valid: false, message: 'Full name can only contain letters, spaces, and periods.' };
  }

  return { valid: true, cleanName: trimmed };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateFullName
};
