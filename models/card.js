const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cardSchema = new Schema({
  name: {
    type: String,
    require: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  source: {
    type: String,
    require: true,
  },
  category: {
    type: String,
    require: true,
  },
});

module.exports = mongoose.model("Card", cardSchema);
