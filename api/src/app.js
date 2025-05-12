import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { errorHandler } from './middlewares/error.js';
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import doctorScheduleRoutes from './routes/doctorScheduleRoutes.js';

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();

// Middleware de parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Configuration de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true
}));

// Logging en développement
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Middleware de logging pour le débogage
app.use((req, res, next) => {
    console.log('Requête reçue:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
    });
    next();
});

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connecté à MongoDB'))
    .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/doctor-schedules', doctorScheduleRoutes);
app.use('/api/v1', paymentRoutes);

// Middleware de gestion des erreurs
app.use(errorHandler);

export default app;
