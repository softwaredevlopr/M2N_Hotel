const { sendValidationError } = require("../utils/apiResponse");

function getValue(req, location, field) {
  if (location === "body") return req.body[field];
  if (location === "query") return req.query[field];
  if (location === "params") return req.params[field];
  return undefined;
}

function runRule(value, rule, field) {
  const errors = [];

  if (rule.required && (value === undefined || value === null || value === "")) {
    errors.push(`${field} is required`);
    return errors;
  }

  if (value === undefined || value === null) {
    return errors;
  }

  if (rule.type === "string" && typeof value !== "string") {
    errors.push(`${field} must be a string`);
  }

  if (rule.type === "number") {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      errors.push(`${field} must be a number`);
    }
  }

  if (rule.type === "email" && typeof value === "string") {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      errors.push(`${field} must be a valid email`);
    }
  }

  if (rule.minLength && typeof value === "string" && value.length < rule.minLength) {
    errors.push(`${field} must be at least ${rule.minLength} characters`);
  }

  if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength) {
    errors.push(`${field} must be at most ${rule.maxLength} characters`);
  }

  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${field} must be one of: ${rule.enum.join(", ")}`);
  }

  return errors;
}

function validate(schemas = {}) {
  return (req, res, next) => {
    const allErrors = [];

    Object.entries(schemas).forEach(([location, rules]) => {
      Object.entries(rules).forEach(([field, rule]) => {
        const value = getValue(req, location, field);
        const fieldErrors = runRule(value, rule, field);
        allErrors.push(...fieldErrors);
      });
    });

    if (allErrors.length > 0) {
      return sendValidationError(res, allErrors);
    }

    return next();
  };
}

module.exports = validate;
