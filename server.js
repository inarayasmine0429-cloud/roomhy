const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware (JSON parsing & Security)
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Run seeder (creates a default superadmin) - best effort, non-blocking
try {
    const seed = require('./roomhy-backend/seeder');
    seed().catch(err => console.error('Seeder error:', err));
} catch (err) {
    console.warn('Seeder not available or failed to load:', err.message);
}

// Routes (Endpoints)
// Routes live under the `roomhy-backend/routes` folder
app.use('/api/auth', require('./roomhy-backend/routes/authRoutes'));
app.use('/api/properties', require('./roomhy-backend/routes/propertyRoutes'));
app.use('/api/admin', require('./roomhy-backend/routes/adminRoutes'));
app.use('/api/tenants', require('./roomhy-backend/routes/tenantRoutes'));
app.use('/api/visits', require('./roomhy-backend/routes/visitRoutes'));
app.use('/api/rooms', require('./roomhy-backend/routes/roomRoutes'));
app.use('/api/notifications', require('./roomhy-backend/routes/notificationRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));