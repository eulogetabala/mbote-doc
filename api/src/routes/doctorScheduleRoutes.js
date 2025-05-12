import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, doctorScheduleValidation } from '../middlewares/validator.js';
import {
    createOrUpdateSchedule,
    getSchedule,
    getAvailability,
    addBreak,
    addHoliday,
    requestVacation,
    handleVacationRequest
} from '../controllers/doctorScheduleController.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les médecins
router.post(
    '/:doctorId',
    authorize('doctor'),
    doctorScheduleValidation.create,
    validate,
    createOrUpdateSchedule
);

router.get(
    '/:doctorId',
    authorize('doctor', 'admin'),
    getSchedule
);

router.get(
    '/:doctorId/availability',
    authorize('doctor', 'admin'),
    getAvailability
);

router.post(
    '/:doctorId/breaks',
    authorize('doctor'),
    doctorScheduleValidation.break,
    validate,
    addBreak
);

router.post(
    '/:doctorId/holidays',
    authorize('doctor'),
    doctorScheduleValidation.holiday,
    validate,
    addHoliday
);

// Routes pour les demandes de congés
router.post(
    '/:doctorId/vacations',
    authorize('doctor'),
    doctorScheduleValidation.vacationRequest,
    validate,
    requestVacation
);

// Routes pour l'administration
router.patch(
    '/:doctorId/vacations/:vacationId',
    authorize('admin'),
    handleVacationRequest
);

export default router; 