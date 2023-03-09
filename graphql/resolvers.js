const validator = require("validator");
const bcrypt = require("bcryptjs");
const FormData = require("form-data");
const Mailgun = require("mailgun.js");
const mongodb = require("mongodb");
const Cookies = require("cookies");

const User = require("../models/user");
const Confirmation = require("../models/confirmation");
const jwt = require("jsonwebtoken");
const Card = require("../models/card");
const History = require("../models/history");
const { Types } = require("mongoose");
require("dotenv").config();

module.exports.sendConfirmationMail = async (
  userId,
  email,
  confirmation = null
) => {
  // Sending confirmation mail using MailGun API
  const mailgun = new Mailgun(FormData);
  const client = mailgun.client({
    username: "api",
    key: process.env.MAIL_GUN_API_KEY,
  });

  let createConfirmation;
  if (!confirmation) {
    const confirmation = new Confirmation({
      _id: mongodb.ObjectId(),
      userId: userId,
      expiredAt: new Date().getTime() + +process.env.CONFIRMATION_EXPIRY,
    });
    createConfirmation = await confirmation.save();
  } else {
    if (confirmation.expiredAt < new Date().getTime()) {
      confirmation.expiredAt =
        +new Date().getTime() + +process.env.CONFIRMATION_EXPIRY;
      createConfirmation = await confirmation.save();
    } else {
      createConfirmation = confirmation;
    }
  }

  const mailConfirmationLink =
    process.env.FRONTEND_URL +
    `/confirmation/${createConfirmation._id.toString()}`;

  const messageData = {
    from: "me@samples.mailgun.org",
    to: email,
    subject: "Hi! this is for testing",
    text: `${mailConfirmationLink}`,
  };

  return client.messages.create(process.env.DOMAIN, messageData);
};

module.exports = {
  createUser: async ({ userInput }, req) => {
    const error = [];
    if (!validator.isEmail(userInput.email)) {
      error.push({
        message: "Email is invalid.",
      });
    }
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      error.push({ message: "Password is too short!" });
    }
    if (error.length > 0) {
      const errorGlobal = new Error("Invalid input.");
      errorGlobal.data = error;
      errorGlobal.code = 422;
      throw errorGlobal;
    }

    // console.log(userInput);rs
    const existingUser = await User.findOne({ username: userInput.username });
    if (existingUser) {
      const error = new Error("User already exists!");
      error.code = 400;
      throw error;
    }

    const existingUserEmail = await User.findOne({ email: userInput.email });
    if (existingUserEmail) {
      const error = new Error("Email address already exists!");
      error.code = 400;
      throw error;
    }

    if (userInput.password !== userInput.confirmPassword) {
      const error = new Error("Password didn't match with confirm-password!");
      error.code = 400;
      throw error;
    }

    const hashPassword = await bcrypt.hash(userInput.password, 12);

    const user = new User({
      email: userInput.email,
      username: userInput.username,
      password: hashPassword,
    });

    const createUser = await user.save();

    try {
      const res = await this.sendConfirmationMail(
        createUser._id.toString(),
        createUser.email
      );
    } catch (err) {
      console.log(err);
    }

    return { ...createUser._doc, _id: createUser._id.toString() };
  },

  user: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const user = await User.findOne(req.userId);
    if (!user) {
      const error = new Error("No user found.");
      error.code = 401;
      throw error;
    }

    return { ...user._doc, _id: user._id.toString() };
  },

  confirmation: async ({ _id }, req) => {
    if (!_id) {
      const error = new Error("Not a valid URL.");
      error.code = 400;
      throw error;
    }

    const confirmation = await Confirmation.findById(_id);

    if (!confirmation) {
      const error = new Error("Invalid confirmation URL.");
      error.code = 400;
      throw error;
    }

    if (new Date().getTime() > +confirmation.expiredAt) {
      const error = new Error("Confirmation URL has expired!");
      error.code = 503;
      throw error;
    }

    const user = await User.findOne(confirmation.userId);

    if (!user) {
      const error = new Error("User does not exist!");
      error.code = 400;
      throw error;
    }

    if (user.status === process.env.USER_STATUS_CONFIRMED) {
      const error = new Error("Already confirmed!");
      error.code = 400;
      throw error;
    }

    user.status = process.env.USER_STATUS_CONFIRMED;
    const resUser = await user.save();

    return { ...confirmation._doc, _id: confirmation._id.toString() };
  },

  resendConfirmation: async ({ username }, req) => {
    if (!username) {
      const error = new Error("Please enter a valid username");
      error.code = 400;
      throw error;
    }

    const users = await User.find({ username: username });
    const user = users[0];

    if (!user) {
      const error = new Error("User does not exist!");
      error.code = 400;
      throw error;
    }

    if (user.status === process.env.USER_STATUS_CONFIRMED) {
      const error = new Error("Already confirmed!");
      error.code = 400;
      throw error;
    }

    // check for presence of valid confirmation document

    const confirmations = await Confirmation.find({ userId: user._id });
    const confirmation = confirmations[0];

    if (!confirmation) {
      const error = new Error("User hasn't registered yet!");
      error.code = 400;
      throw error;
    }

    try {
      // if there is no valid confirmation document then update old document and send mail
      const res = await this.sendConfirmationMail(
        user._id.toString(),
        user.email,
        confirmation
      );
      return "Email sent successfully!";
    } catch (err) {
      console.log(err);
      return err.toString();
    }
  },

  login: async ({ username, password }, ctx) => {
    // userInput data validation
    const error = [];
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      error.push({ message: "Password is too short!" });
    }
    if (error.length > 0) {
      const errorGlobal = new Error("Invalid input.");
      errorGlobal.data = error;
      errorGlobal.code = 422;
      throw errorGlobal;
    }

    const user = await User.findOne({ username: username });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect!");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    return { token: token, userId: user._id.toString() };
  },

  getData: async ({ _id }, ctx) => {
    if (!_id) {
      const error = new Error("_id didn't passed.");
      error.code = 400;
      throw error;
    }

    const user = await User.findOne({ _id: _id });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const cards = await Card.find({ author: _id });

    return { cards: cards };
  },

  createCard: async (input, ctx) => {
    const userInput = input.cardInput;

    const user = await User.findOne({ _id: userInput.author });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const card = await Card.findOne({ name: userInput.name });
    if (card) {
      const error = new Error("Card with this name already exist.");
      error.code = 401;
      throw error;
    }

    const userCard = new Card({
      name: userInput.name,
      source: userInput.source,
      category: userInput.category,
      author: userInput.author,
    });

    try {
      await userCard.save();
    } catch (err) {
      throw err;
    }

    return "Card created successfully.";
  },

  getCategories: async ({ _id }, ctx) => {
    if (!_id) {
      const error = new Error("_id didn't passed.");
      error.code = 400;
      throw error;
    }

    const user = await User.findOne({ _id: _id });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const cats = await Card.find({ author: _id }).select({
      category: 1,
      _id: 0,
    });

    const categoriesSet = new Set();

    cats.forEach((item) => categoriesSet.add(item.category));

    console.log(Array.from(categoriesSet));

    return Array.from(categoriesSet);
  },

  getCards: async ({ _id, category }, ctx) => {
    if (!_id) {
      const error = new Error("_id didn't passed.");
      error.code = 400;
      throw error;
    }

    if (!category) {
      const error = new Error("category didn't passed.");
      error.code = 400;
      throw error;
    }

    const user = await User.findOne({ _id: _id });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const cardsList = await Card.find({ author: _id, category: category });

    const updatedCardsList = cardsList.map((card) => {
      return {
        ...card._doc,
        _id: card._id.toString(),
      };
    });

    console.log(updatedCardsList);

    return updatedCardsList;
  },

  getCard: async ({ userId, cardId }, ctx) => {
    if (!userId) {
      const error = new Error("userId didn't passed.");
      error.code = 400;
      throw error;
    }
    if (!cardId) {
      const error = new Error("cardId didn't passed.");
      error.code = 400;
      throw error;
    }

    const user = await User.findOne({ _id: userId });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const card = await Card.findOne({ _id: cardId });
    if (!card) {
      const error = new Error("Card doesn't exists.");
      error.code = 401;
      throw error;
    }

    return card;
  },

  updateCard: async (input, ctx) => {
    const userInput = input.cardUpdateData;

    const user = await User.findOne({ _id: userInput.author });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const card = await Card.findOne({ _id: userInput._id });
    if (!card) {
      const error = new Error("Card doesn't exist.");
      error.code = 401;
      throw error;
    }

    card.name = userInput.name;
    card.source = userInput.source;
    card.category = userInput.category;

    try {
      await card.save();
    } catch (err) {
      throw err;
    }

    return "Card updated successfully.";
  },

  deleteCard: async ({ userId, cardId }, ctx) => {
    if (!userId) {
      const error = new Error("userId didn't passed.");
      error.code = 400;
      throw error;
    }
    if (!cardId) {
      const error = new Error("cardId didn't passed.");
      error.code = 400;
      throw error;
    }

    const user = await User.findOne({ _id: userId });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const card = await Card.findOne({ _id: cardId });
    if (!card) {
      const error = new Error("Card doesn't exist.");
      error.code = 401;
      throw error;
    }

    try {
      await card.delete();
    } catch (err) {
      throw err;
    }

    return "Card deleted successfully.";
  },

  deleteAllSelectedCards: async ({ userId, cardIds }, ctx) => {
    if (!userId) {
      const error = new Error("userId didn't passed.");
      error.code = 400;
      throw error;
    }
    if (!cardIds) {
      const error = new Error("cardId didn't passed.");
      error.code = 400;
      throw error;
    }

    const user = await User.findOne({ _id: userId });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    try {
      await Card.deleteMany({ _id: { $in: cardIds } });
    } catch (err) {
      throw err;
    }

    return "Cards are deleted successfully.";
  },

  createHistory: async (input, ctx) => {
    const historyInput = input.historyInputData;
    console.log(historyInput);

    const user = await User.findOne({ _id: historyInput.userId });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const history = new History({
      name: historyInput.name,
      source: historyInput.source,
      date: historyInput.date,
      author: historyInput.userId,
    });

    try {
      await history.save();
    } catch (err) {
      throw err;
    }

    return "user history has been created successfully.";
  },

  getHistories: async ({ userId }, ctx) => {
    if (!userId) {
      const error = new Error("userId didn't passed.");
      error.code = 400;
      throw error;
    }

    const user = await User.findOne({ _id: userId });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const histories = await History.find({ author: userId });

    return histories;
  },
};
