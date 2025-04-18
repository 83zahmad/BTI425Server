const express = require('express');
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const userService = require("./user-service.js");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const jwt = require("jsonwebtoken");

// JWT config
const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

// Add JWT expiration time (24 hours)
const JWT_EXPIRATION = '24h';

const strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
  userService.getUserById(jwt_payload._id)
    .then(user => {
      if (user) next(null, user);
      else next(null, false);
    })
    .catch(err => next(err, false));
});

passport.use(strategy);
app.use(passport.initialize());

const HTTP_PORT = process.env.PORT || 8080;
app.use(express.json());
app.use(cors());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ROUTES

app.post("/api/user/register", (req, res) => {
  userService.registerUser(req.body)
    .then((msg) => {
      res.json({ message: msg });
    }).catch((msg) => {
      res.status(400).json({ message: msg });
    });
});

app.post("/api/user/login", (req, res) => {
  userService.checkUser(req.body)
    .then((user) => {
      const payload = {
        _id: user._id,
        userName: user.userName
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRATION });
      res.json({ message: "login successful", token });
    })
    .catch(msg => {
      res.status(401).json({ message: msg });
    });
});

app.get("/api/user/favourites", passport.authenticate("jwt", { session: false }), (req, res) => {
  userService.getFavourites(req.user._id)
    .then(data => {
      res.json(data);
    }).catch(msg => {
      res.status(422).json({ error: msg });
    });
});

app.put("/api/user/favourites/:id", passport.authenticate("jwt", { session: false }), (req, res) => {
  userService.addFavourite(req.user._id, req.params.id)
    .then(data => {
      res.json(data);
    }).catch(msg => {
      res.status(422).json({ error: msg });
    });
});

app.delete("/api/user/favourites/:id", passport.authenticate("jwt", { session: false }), (req, res) => {
  userService.removeFavourite(req.user._id, req.params.id)
    .then(data => {
      res.json(data);
    }).catch(msg => {
      res.status(422).json({ error: msg });
    });
});

app.get("/api/user/history", passport.authenticate("jwt", { session: false }), (req, res) => {
  userService.getHistory(req.user._id)
    .then(data => {
      res.json(data);
    }).catch(msg => {
      res.status(422).json({ error: msg });
    });
});

app.put("/api/user/history/:id", passport.authenticate("jwt", { session: false }), (req, res) => {
  userService.addHistory(req.user._id, req.params.id)
    .then(data => {
      res.json(data);
    }).catch(msg => {
      res.status(422).json({ error: msg });
    });
});

app.delete("/api/user/history/:id", passport.authenticate("jwt", { session: false }), (req, res) => {
  userService.removeHistory(req.user._id, req.params.id)
    .then(data => {
      res.json(data);
    }).catch(msg => {
      res.status(422).json({ error: msg });
    });
});

// INIT DB and START SERVER
module.exports = async (req, res) => {
    try {
      await userService.connect(); // Ensure DB connection before handling
      return app(req, res); // Pass request to Express
    } catch (err) {
      console.error("Failed to connect to DB:", err);
      res.status(500).send("Server error");
    }
  };