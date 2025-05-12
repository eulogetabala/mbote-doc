import express from 'express';
import {
    createPayment,
    getPayment,
    getPaymentHistory,
    refundPayment
} from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';

const router = express.Router();

// Routes protégées par authentification
router.use(authenticate);

// Routes pour les paiements
router.post('/appointments/:appointmentId/payments', authorize('patient'), createPayment);
router.get('/payments/:paymentId', authorize('patient', 'doctor', 'admin'), getPayment);
router.get('/payments', authorize('patient', 'doctor', 'admin'), getPaymentHistory);

// Route pour les remboursements (admin uniquement)
router.post('/payments/:paymentId/refund', authorize('admin'), refundPayment);

export default router; 