import express from 'express';
import * as patientController from '../controllers/patientController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, patientValidation } from '../middlewares/validator.js';

const router = express.Router();

// Routes publiques - DOIT être avant le middleware authenticate
router.post(
    '/register',
    patientValidation.register,
    validate,
    patientController.registerPatient
);

router.post(
    '/verify-otp',
    patientValidation.verifyOTP,
    validate,
    patientController.verifyPatientOTP
);

// Middleware d'authentification pour les routes protégées
router.use(authenticate);

// Routes protégées
router.get(
    '/nearby-doctors',
    authorize('patient'),
    patientValidation.findNearbyDoctors,
    validate,
    patientController.findNearbyDoctors
);

router.put(
    '/profile',
    authorize('patient'),
    patientValidation.completeProfile,
    validate,
    patientController.completePatientProfile
);

// Routes avec ID
router.get(
    '/:patientId',
    authorize('admin', 'patient'),
    patientController.getPatientDetails
);

router.put(
    '/:patientId',
    authorize('patient', 'admin'),
    patientValidation.update,
    validate,
    patientController.updatePatient
);

router.put(
    '/:patientId/deactivate',
    authorize('admin'),
    patientController.deactivatePatient
);

export default router; 