import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
    createAppointment,
    getPatientAppointments,
    getDoctorAppointments,
    confirmAppointment,
    completeAppointment,
    cancelAppointment
} from '../controllers/appointmentController.js';

const router = express.Router();

// Routes pour les patients
router.post('/', authenticate, authorize('patient'), createAppointment);
router.get('/patient', authenticate, authorize('patient'), getPatientAppointments);

// Routes pour les médecins
router.get('/doctor', authenticate, authorize('doctor'), getDoctorAppointments);
router.patch('/:appointmentId/confirm', authenticate, authorize('doctor'), confirmAppointment);
router.patch('/:appointmentId/complete', authenticate, authorize('doctor'), completeAppointment);

// Route pour annuler un rendez-vous (accessible aux patients et médecins)
router.patch('/:appointmentId/cancel', authenticate, authorize('patient', 'doctor'), cancelAppointment);

export default router; 