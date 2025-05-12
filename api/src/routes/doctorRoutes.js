import express from 'express';
import * as doctorController from '../controllers/doctorController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, doctorValidation } from '../middlewares/validator.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * @route   PUT /api/v1/doctors/location
 * @desc    Mettre à jour la localisation d'un médecin
 * @access  Private (Médecin uniquement)
 */
router.put(
    '/location',
    authorize('doctor'),
    doctorValidation.updateLocation,
    validate,
    doctorController.updateLocation
);

/**
 * @route   POST /api/v1/doctors
 * @desc    Créer un nouveau médecin
 * @access  Private (Admin uniquement)
 */
router.post(
    '/',
    authorize('admin'),
    doctorValidation.create,
    validate,
    doctorController.createDoctor
);

/**
 * @route   PUT /api/v1/doctors/:doctorId/approve
 * @desc    Approuver un médecin
 * @access  Private (Admin uniquement)
 */
router.put(
    '/:doctorId/approve',
    authorize('admin'),
    doctorController.approveDoctor
);

/**
 * @route   PUT /api/v1/doctors/:doctorId/reject
 * @desc    Rejeter un médecin
 * @access  Private (Admin uniquement)
 */
router.put(
    '/:doctorId/reject',
    authorize('admin'),
    doctorValidation.reject,
    validate,
    doctorController.rejectDoctor
);

/**
 * @route   GET /api/v1/doctors
 * @desc    Lister tous les médecins
 * @access  Private (Tous les utilisateurs authentifiés)
 */
router.get('/', doctorController.listDoctors);

/**
 * @route   GET /api/v1/doctors/:doctorId
 * @desc    Obtenir les détails d'un médecin
 * @access  Private (Tous les utilisateurs authentifiés)
 */
router.get('/:doctorId', doctorController.getDoctorDetails);

export default router; 