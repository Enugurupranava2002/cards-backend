const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const historySchema = new Schema({
  name: {
    type: String,
    require: true,
  },
  source: {
    type: String,
    require: true,
  },
  date: {
    type: String,
    require: true,
  },
  author: {
    type: String,
    require: true,
  },
});

module.exports = mongoose.model("History", historySchema);
