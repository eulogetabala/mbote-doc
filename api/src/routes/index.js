import express from 'express';
import authRoutes from './authRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import patientRoutes from './patientRoutes.js';
import adminRoutes from './adminRoutes.js';
import { notFound } from '../middlewares/error.js';

const router = express.Router();

// Routes principales
router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/patients', patientRoutes);
router.use('/admin', adminRoutes);

// Route pour les ressources non trouvées
router.use(notFound);

export default router; 