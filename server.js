require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Configure rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Configure CORS options
const corsOptions = {
    origin: ['http://127.0.0.1:5501', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Authentication endpoint - moved before rate limiter
app.post('/api/auth', (req, res) => {
    try {
        // Generate a more secure token
        const token = jwt.sign(
            { 
                user: 'test-user',
                timestamp: Date.now()
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { 
                expiresIn: '1h',
                algorithm: 'HS256'
            }
        );
        
        // Set token in cookie and send response
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600000 // 1 hour
        }).json({ token });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Store created organisms and ecosystem state
let organisms = [];
let ecosystemState = {
  temperature: 25,
  humidity: 60,
  pH: 7,
  resources: {
    nutrients: 1000,
    water: 1000,
    light: 1000
  }
};

// API endpoints
app.get('/api/ecosystem', (req, res) => {
  res.json(ecosystemState);
});

app.put('/api/ecosystem', (req, res) => {
  ecosystemState = {
    ...ecosystemState,
    ...req.body
  };
  res.json(ecosystemState);
});

app.get('/api/organisms', (req, res) => {
  res.json(organisms);
});

app.post('/api/organisms', (req, res) => {
  try {
    const organism = req.body;
    organisms.push(organism);
    res.status(201).json(organism);
  } catch (error) {
    console.error('Create organism error:', error);
    res.status(500).json({ error: 'Failed to create organism' });
  }
});

// SSL configuration
const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH)
};

// Start both HTTP and HTTPS servers
app.listen(port, () => {
    console.log(`HTTP server running on http://localhost:${port}`);
});

const httpsPort = process.env.HTTPS_PORT || 3443;
https.createServer(httpsOptions, app).listen(httpsPort, () => {
    console.log(`HTTPS server running on https://localhost:${httpsPort}`);
});