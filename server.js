/*
    Ostaa - Marketplace Backend Server

    Purpose: 
    - This server application is designed to handle the backend operations of 
      the Ostaa online marketplace.
    - It establishes a connection to a MongoDB database to store and retrieve user
      and item data.
    - Implements RESTful API endpoints to allow account creation, user 
      authentication, item listing, and searching.
    - Manages user sessions with cookie-based authentication for security and state
      maintenance.
    - Serves static files and handles server-side rendering for certain protected routes.

    Functionalities:
    - User authentication: Verify user credentials and manage user sessions for secure
      access to the application.
    - Account management: Allows new users to create accounts and handles the uniqueness
      of usernames.
    - Item management: Enables users to post new items for sale, list all items, and 
      search for items based on descriptions.
    - Session management: Automatically removes expired sessions and maintains active
      user sessions for seamless user experience.
    - Static file serving: Delivers the frontend assets like HTML, CSS, and client-side
      JavaScript to the user's browser.
    
    Author: Sherali Ozodov
    Course: CSC 337
    File: server.js
*/

// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const port = 80;

// Connect to the MongoDB database
mongoose.connect('mongodb://127.0.0.1/ostaa', 
        { useNewUrlParser: true, useUnifiedTopology: true });

// Handle MongoDB connection errors
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define the schema for items
const itemSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: String,
  stat: { type: String, default: 'SALE' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// Create the Item model
const Item = mongoose.model('Item', itemSchema);

// Define the schema for users
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String, // Make sure to hash passwords in production
  listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  purchases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
});

// Create the User model
const User = mongoose.model('User', userSchema);

// Middleware for parsing cookies and request bodies
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Object to hold active sessions with session ID as key
let sessions = {};

// Creates a new user session.
function addSession(usernameString) {
  let sid = Math.floor(Math.random() * 1000000000);
  // Record current time to track session creation time
  let now = Date.now();
  // Create session object and add it to the sessions object
  sessions[sid] = {
    username: usernameString,
    id: sid,
    time: now
  };
  return sid;
}

// Removes sessions that have expired.
// Session expiration is set to 20 minutes (1200000 milliseconds).
function removeSessions() {
  let now = Date.now();

  // Iterate over all the sessions
  for (let sid in sessions) {
    if (sessions.hasOwnProperty(sid)) {
      let session = sessions[sid];
      // Check if the session has expired
      if (session.time + 1200000 < now) {
        // If the session has expired, delete it from the sessions object
        delete sessions[sid];
      }
    }
  }
}

// Set the interval for session cleanup
setInterval(removeSessions, 60000);

// This function authenticates the user by checking the session cookie.
function authenticate(req, res, next) {
  // Retrieve the session ID from the cookie
  let sessionCookie = req.cookies['session_id'];

  if (sessionCookie) {
    // Look up the session by the session ID
    let sessionKey = Object.keys(sessions).find(key => sessions[key].id == sessionCookie);
    let session = sessions[sessionKey];

    // Check if session exists and hasn't expired
    if (session && (Date.now() - session.time) < 1200000) {
      // Create a session on the request object if it's not already there
      if (!req.session) req.session = {};
      req.session.username = session.username;
      next();
    } else {
      // If session doesn't exist or is expired, delete it and redirect to index
      if (session) {
        delete sessions[sessionKey];
        res.redirect('/index.html');
      } else {
        // If session is not found, redirect to index
        res.redirect('/index.html');
      }
    }
  } else {
    // If no session cookie, redirect to index
    res.redirect('/index.html');
  }
}

// Route to get the username of the logged-in user
app.get('/get-username', authenticate, (req, res) => {
  // Return the username from the session
  res.json({ username: req.session.username });
});

// Middleware for serving static files, but with authentication for certain paths
app.use((req, res, next) => {
  // Check if request is for 'post.html' or 'home.html'
  if (req.path === '/post.html' || req.path === '/home.html') {
    // Authenticate before serving these files
    authenticate(req, res, next);
  } else {
    next();
  }
}, express.static('public_html'));

// Specific route to serve 'post.html' if authenticated
app.get('/post.html', authenticate, (req, res) => {
  res.sendFile(__dirname + '/public_html/post.html');
});

// Specific route to serve 'home.html' if authenticated
app.get('/home.html', authenticate, (req, res) => {
  res.sendFile(__dirname + '/public_html/home.html');
});

// Middleware for serving static files from the 'public_html' directory
app.use(express.static('public_html'));

// POST route for handling the login process
app.post('/login', (req, res) => {
  // Extract username and password from the request body
  const { username, password } = req.body;

  // Look up the user by username in the database
  User.findOne({ username: username })
    .then(user => {
      // If user is not found, respond with an error
      if (!user) {
        return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
      }
      // If passwords match, authenticate the user
      if (user.password === password) {
        // Add a session for the user
        let sid = addSession(username);
        // Set the cookie with the session ID
        res.cookie('session_id', sid, { maxAge: 1200000, httpOnly: true });
        // Respond with success and the redirection URL
        res.json({ success: true, redirectTo: '/home.html' });
      } else {
        // If passwords don't match, respond with an error
        res.status(401).json({ success: false, message: 'Incorrect username or password.' });
      }
    })
    .catch(err => {
      // Handle any other errors during the process
      res.status(500).json({ success: false, message: 'An error occurred during login.' });
    });
});

// POST route for handling the creation of a new account
app.post('/create-account', (req, res) => {
  // Destructure username and password from the request body
  const { username, password } = req.body;
  User.findOne({ username: username })
    .then(existingUser => {
      // If username is taken, return a conflict error
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Username is already taken.' });
      }
      // If username is not taken, create a new user instance
      const newUser = new User({ username, password });
      // Save the new user to the database
      newUser.save()
        .then(() => {
          // Respond with success if the user is successfully created
          res.status(201).json({ success: true, message: 'Account created successfully.' })
        })
        .catch(err => {
          res.status(500).json({ success: false, message: 'Error creating new user.' });
        });
    })
    .catch(err => {
      // Handle errors in checking for existing user
      res.status(500).json({ success: false, message: 'Error checking for existing user.' });
    });
});

// POST endpoint to handle the submission of a new item
app.post('/add-item', (req, res) => {
  // Retrieve the session ID from the cookie
  const sessionId = req.cookies['session_id'];

  // If there is no session ID, or it doesn't correspond to a valid session, respond with an error
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ message: 'You must be logged in to add items.' });
  }

  // Retrieve the username from the active sessions
  const username = sessions[sessionId].username;

  // Create a new item instance with the provided data
  const newItem = new Item({
    title: req.body['title-item'],
    description: req.body.description,
    price: req.body.price,
    stat: req.body.status,
  });

  // Save the new item to the database
  newItem.save()
    .then(savedItem => {
      // Use the saved item's ID to update the user's listings
      return User.findOneAndUpdate(
        { username: username },
        { $push: { listings: savedItem._id } },
        { new: true }
      );
    })
    .then(updatedUser => {
      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.redirect('/home.html');
    })
    .catch(error => {
      res.status(500).json({ message: 'Error creating item', error: error.toString() });
    });
});

// GET endpoint to list all items
app.get('/list-items', (req, res) => {
  // Find all items in the database and execute the query
  Item.find().exec()
    .then(items => {
      res.json(items);
    })
    .catch(error => {
      // Handle errors in fetching the items
      res.status(500).send(error);
    });
});

// POST endpoint for searching items by description
app.post('/search-items', (req, res) => {
  const query = req.body.query;

  // Search for items where the description matches the query
  Item.find({ description: new RegExp(query, 'i') })
    .then(listings => {
      // Respond with the search results as JSON
      res.json(listings);
    })
    .catch(err => {
      // Log and handle errors during the search query
      console.error('Error querying the database:', err);
      res.status(500).send('An error occurred while searching for listings');
    });
});

// POST route for handling item purchases
app.post('/purchase-item', authenticate, (req, res) => {
  const { itemId } = req.body;
  const username = req.session.username;

  // Update the item's status to "SOLD" in the database
  Item.findByIdAndUpdate(
    itemId,
    { $set: { stat: 'SOLD' } },
    { new: true }
  )
    .then(updatedItem => {
      if (!updatedItem) {
        return res.status(404).json({ success: false, message: 'Item not found.' });
      }

      // Add the purchased item to the user's purchases array
      User.findOneAndUpdate(
        { username: username },
        { $push: { purchases: itemId } },
        // Ensure that the updated user document is returned
        { new: true }
      )
        .then(user => {
          if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
          }
          res.json({ success: true, message: 'Item purchased successfully!' });
        })
        .catch(error => {
          console.error('Error adding item to user purchases:', error);
          res.status(500).json({ success: false, message: 'Error purchasing item.' });
        });
    })
    .catch(error => {
      console.error('Error updating item status:', error);
      res.status(500).json({ success: false, message: 'Error purchasing item.' });
    });
});

// GET route to retrieve user's purchased items
app.get('/user-purchases', authenticate, (req, res) => {
  const username = req.session.username;

  User.findOne({ username: username })
    .populate('purchases')
    .exec()
    .then((user) => {
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      res.json(user.purchases);
    })
    .catch((error) => {
      console.error('Error retrieving user purchases:', error);
      res.status(500).json({ success: false, message: 'Error retrieving purchases.' });
    });
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
