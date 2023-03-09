const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const confirmationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  expiredAt: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Confirmation", confirmationSchema);
