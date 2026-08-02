const ADMIN_ROLES = ["super_admin", "hotel_admin"];

const loginSchema = {
  body: {
    email: { required: true, type: "email", maxLength: 255 },
    password: { required: true, type: "string", minLength: 1, maxLength: 200 },
  },
};

module.exports = {
  ADMIN_ROLES,
  loginSchema,
};
