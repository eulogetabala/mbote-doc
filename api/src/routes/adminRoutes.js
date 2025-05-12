import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, doctorValidation } from '../middlewares/validator.js';
import {
    createDoctor,
    approveDoctor,
    rejectDoctor,
    listDoctors
} from '../controllers/admin/doctorManagement.js';
import {
    createInitialAdmin,
    verifyAdminOTP
} from '../controllers/adminController.js';

const router = express.Router();

// Route pour créer le compte administrateur initial (pas besoin d'authentification)
router.post('/initial-setup', createInitialAdmin);
router.post('/verify-otp', verifyAdminOTP);

// Toutes les routes suivantes nécessitent une authentification et des droits d'admin
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   POST /api/v1/admin/doctors
 * @desc    Créer un nouveau médecin
 * @access  Private (Admin uniquement)
 */
router.post('/doctors', doctorValidation.create, validate, createDoctor);

/**
 * @route   POST /api/v1/admin/doctors/:id/approve
 * @desc    Approuver un médecin
 * @access  Private (Admin uniquement)
 */
router.post('/doctors/:id/approve', approveDoctor);

/**
 * @route   POST /api/v1/admin/doctors/:id/reject
 * @desc    Rejeter un médecin
 * @access  Private (Admin uniquement)
 */
router.post('/doctors/:id/reject', doctorValidation.reject, validate, rejectDoctor);

/**
 * @route   GET /api/v1/admin/doctors
 * @desc    Lister tous les médecins
 * @access  Private (Admin uniquement)
 */
router.get('/doctors', listDoctors);

export default router; 