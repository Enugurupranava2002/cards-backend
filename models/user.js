const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true,
  },
  username: {
    type: String,
    require: true,
  },
  status: {
    type: String,
    default: process.env.USER_STATUS_NOT_CONFIRMED,
  },
});

module.exports = mongoose.model("User", userSchema);
