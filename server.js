require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(helmet());
app.use(cors({
    origin: 'https://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
app.use('/api/', limiter);


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

app.get('/api/ecosystem', (req, res) => {
  res.json(ecosystemState);
});

app.post('/api/organisms', (req, res) => {
  const organism = req.body;
  organisms.push(organism);
  res.json(organism);
});

// Add new endpoints for organism management
app.get('/api/organisms', (req, res) => {
  res.json(organisms);
});

app.delete('/api/organisms/:id', (req, res) => {
  const index = organisms.findIndex(org => org.name === req.params.id);
  if (index > -1) {
    organisms.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Organism not found' });
  }
});

app.put('/api/ecosystem', (req, res) => {
  ecosystemState = {
    ...ecosystemState,
    ...req.body
  };
  res.json(ecosystemState);
});

// Enhance environment simulation
function simulateEnvironment() {
  // Random environmental fluctuations with bounds
  ecosystemState.temperature = Math.max(0, Math.min(40, 
    ecosystemState.temperature + (Math.random() - 0.5) * 0.1
  ));
  ecosystemState.humidity = Math.max(0, Math.min(100, 
    ecosystemState.humidity + (Math.random() - 0.5) * 0.1
  ));
  ecosystemState.pH = Math.max(0, Math.min(14, 
    ecosystemState.pH + (Math.random() - 0.5) * 0.01
  ));
  
  // Resource regeneration with day/night cycle
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour <= 18;
  
  ecosystemState.resources.light = isDaytime ? 1000 : 200;
  ecosystemState.resources.nutrients = Math.min(
    1000,
    ecosystemState.resources.nutrients + (isDaytime ? 2 : 1)
  );
  
  // Enhanced water cycle based on humidity
  const evaporation = ecosystemState.temperature * 0.01;
  const precipitation = ecosystemState.humidity > 80 ? 5 : 0;
  
  ecosystemState.resources.water = Math.min(
    1000,
    ecosystemState.resources.water + precipitation - evaporation
  );
}

// Update simulation interval to run more frequently
setInterval(simulateEnvironment, 500);

// Protected routes
app.use('/api', authenticateToken);

// Authentication endpoint
app.post('/auth/login', (req, res) => {
    const token = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Example usage in your frontend code
const authService = new AuthService();

async function authenticate() {
    const success = await authService.login();
    if (success) {
        const token = localStorage.getItem('token');
        console.log('JWT Token:', token);
    }
}

// Start HTTPS server
https.createServer(httpsOptions, app).listen(port, () => {
    console.log(`Secure server running on https://localhost:${port}`);
});


// server.js
const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Load environment variables
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet()); // Add security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Middleware
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.static('public'));

// User model (you would typically use a database)
const users = new Map();

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Input validation middleware
const validateOrganism = [
    body('name').trim().isLength({ min: 3, max: 50 }).escape(),
    body('type').isIn(['producer', 'consumer', 'decomposer']),
    body('traits').isObject(),
    body('traits.growthRate').isFloat({ min: 0, max: 10 }),
    body('traits.resourceConsumption').isFloat({ min: 0, max: 10 }),
    body('traits.resilience').isFloat({ min: 0, max: 10 })
];

// Auth routes
app.post('/api/register', 
    body('username').isLength({ min: 5 }),
    body('password').isLength({ min: 8 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        if (users.has(username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users.set(username, {
            username,
            password: hashedPassword
        });

        res.status(201).json({ message: 'User registered successfully' });
    }
);

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.get(username);

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

// Protected routes
app.get('/api/ecosystem', authenticateToken, (req, res) => {
    res.json(ecosystemState);
});

app.post('/api/organisms', authenticateToken, validateOrganism, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const organism = req.body;
    organisms.push(organism);
    updateEcosystem(organism);
    res.json(organism);
});

// HTTPS configuration
const httpsOptions = {
    key: fs.readFileSync('path/to/private-key.pem'),
    cert: fs.readFileSync('path/to/certificate.pem')
};

// Create HTTPS server
https.createServer(httpsOptions, app).listen(process.env.PORT || 3000, () => {
    console.log(`Secure server running on port ${process.env.PORT || 3000}`);
});

// Frontend code (simulation.js)
class APIService {
    constructor() {
        this.baseURL = process.env.API_URL || 'https://localhost:3000/api';
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers,
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.clearToken();
                    window.location.href = '/login';
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async login(username, password) {
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        this.setToken(response.token);
        return response;
    }

    async register(username, password) {
        return await this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async getEcosystemState() {
        return await this.request('/ecosystem');
    }

    async createOrganism(organism) {
        return await this.request('/organisms', {
            method: 'POST',
            body: JSON.stringify(organism)
        });
    }
}