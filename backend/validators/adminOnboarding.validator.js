const onboardingSchema = {
  body: {
    tenant_name: {
      required: true,
      type: "string",
      minLength: 1,
      maxLength: 255,
    },
    tenant_slug: {
      required: true,
      type: "string",
      minLength: 1,
      maxLength: 120,
    },
    owner_name: {
      required: true,
      type: "string",
      minLength: 1,
      maxLength: 150,
    },
    owner_email: {
      required: true,
      type: "email",
      maxLength: 255,
    },
    owner_password: {
      required: true,
      type: "string",
      minLength: 8,
      maxLength: 200,
    },
    hotel_name: {
      required: true,
      type: "string",
      minLength: 1,
      maxLength: 255,
    },
    hotel_slug: {
      required: true,
      type: "string",
      minLength: 1,
      maxLength: 120,
    },
    city: {
      type: "string",
      maxLength: 120,
    },
    state: {
      type: "string",
      maxLength: 120,
    },
    country: {
      type: "string",
      maxLength: 120,
    },
    phone: {
      type: "string",
      maxLength: 50,
    },
  },
};

module.exports = {
  onboardingSchema,
};
