const express = require("express");
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const auth = require("./middleware/auth");
const graphqlSchema = require("./graphql/schema");
const graphqlResolvers = require("./graphql/resolvers");

const app = express();

app.use((req, res, next) => {
  const allowedOrigins = [
    "https://main--poetic-nougat-40165f.netlify.app",
    "http://localhost:3000",
    "https://example-service-name-frontend-cards.onrender.com",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200).end();
  }
  next();
});

// app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

app.use(bodyParser.json());
app.use(cookieParser());
// app.use(csrf({ cookie: true }));

app.use(auth);

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolvers,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const errorData = err.originalError.data;
      const message = err.message || "An error Occured. Please try again!";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: errorData };
    },
  })
);

app.use((err, req, res, next) => {
  const status = err.statusCode;
  const message = err.message;
  const data = err.data;

  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(process.env.DATABASE_URL)
  .then((result) => {
    app.listen(process.env.PORT);
  })
  .catch((err) => {
    console.log(err);
  });
