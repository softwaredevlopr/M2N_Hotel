const INQUIRY_STATUSES = [
  "pending",
  "contacted",
  "quoted",
  "confirmed",
  "declined",
  "cancelled",
];

const INQUIRY_SOURCES = ["website", "phone", "email", "walk_in", "partner", "other"];

const createInquirySchema = {
  body: {
    hotel_slug: { required: true, type: "string", minLength: 1, maxLength: 120 },
    guest_name: { required: true, type: "string", minLength: 2, maxLength: 150 },
    guest_email: { required: true, type: "email", maxLength: 255 },
    guest_phone: { type: "string", maxLength: 50 },
    room_type_slug: { type: "string", maxLength: 120 },
    check_in_date: { type: "string", maxLength: 10 },
    check_out_date: { type: "string", maxLength: 10 },
    adults_count: { type: "number" },
    children_count: { type: "number" },
    message: { type: "string", maxLength: 4000 },
    source: { type: "string", enum: INQUIRY_SOURCES },
  },
};

const updateInquiryStatusSchema = {
  body: {
    status: { required: true, type: "string", enum: INQUIRY_STATUSES },
    admin_notes: { type: "string", maxLength: 4000 },
  },
};

module.exports = {
  INQUIRY_STATUSES,
  INQUIRY_SOURCES,
  createInquirySchema,
  updateInquiryStatusSchema,
};
