const jwt = require("jsonwebtoken");
const Cookies = require("cookies");

module.exports = (req, res, next) => {
  // this header will only be present in req if user has successgully loggedin
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;
    return next();
  }

  const token = req.get("Authorization").split(" ")[1];
  let decodedToken;

  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (error) {
    req.isAuth = false;
    return next();
  }

  // this decodedToken will be undefined only if verification fails
  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }

  // const csrfToken = req.csrfToken();

  // if (!req.body && csrfToken !== req.body._csrf) {
  //   req.isAuth = false;
  //   return next();
  // }

  req.userId = decodedToken.userId;
  req.isAuth = true;
  // req.locals.csrfToken = csrfToken;

  next();
};
