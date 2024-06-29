
// This file is responsible for setting up the Express app and configuring the main aspects of the server

// For additional security:
// Consider setting up proxy with Cloudflare
// Consider adding rate limiter
// Optimise CORS if needed

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file
const appRouter = require('./app'); // Import routes from app.js

const app = express();
const port = process.env.PORT || 3000;

// CORS setup
const corsOptions = {
    origin: ['https://voiceflow.com', 'https://general-runtime.voiceflow.com'], // add allowed origins
    methods: 'GET, POST',
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to set HTTP headers for security
app.use(helmet());

// Use the routes defined in app.js under the /api path
app.use('/api', appRouter); // Ensure appRouter is imported and used as a middleware

// Error Handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
