export const validNamePattern = /^[a-zA-Z\s]+$/;
export const validEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates if a given name matches the valid name pattern.
 * @param {string} name - The name to validate.
 * @returns {boolean} - True if val id, false otherwise.
 */
export const isValidName = (name) => validNamePattern.test(name);

/**
 * Converts an email to lowercase and validates if it matches the valid email pattern.
 * @param {string} email - The email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export const isValidEmail = (email) => {
  const lowerCaseEmail = email.toLowerCase();
  return validEmailPattern.test(lowerCaseEmail);
};
