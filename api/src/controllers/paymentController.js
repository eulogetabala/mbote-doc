import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import { sendNotification } from '../services/notificationService.js';
import { NOTIFICATION_TYPES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Créer un paiement
export const createPayment = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { paymentMethod, amount, currency } = req.body;

    // Vérifier si le rendez-vous existe
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new ApiError(404, 'Rendez-vous non trouvé');
    }

    // Vérifier si un paiement existe déjà pour ce rendez-vous
    const existingPayment = await Payment.findOne({ appointment: appointmentId });
    if (existingPayment) {
        throw new ApiError(400, 'Un paiement existe déjà pour ce rendez-vous');
    }

    // Créer le paiement
    const payment = await Payment.create({
        appointment: appointmentId,
        patient: appointment.patient,
        doctor: appointment.doctor,
        amount: amount || appointment.consultationFee,
        currency: currency || 'USD',
        paymentMethod,
        status: 'pending'
    });

    // Simuler le traitement du paiement (à remplacer par l'intégration réelle)
    try {
        // TODO: Intégrer le vrai système de paiement ici
        await processPayment(payment);
        
        // Mettre à jour le statut du paiement
        payment.status = 'completed';
        payment.transactionId = `TRX${Date.now()}`;
        await payment.save();

        // Mettre à jour le statut du rendez-vous
        appointment.paymentStatus = 'paid';
        await appointment.save();

        // Notifier le patient et le médecin
        await sendPaymentNotifications(payment, 'completed');

        res.status(201).json({
            success: true,
            data: payment.getPublicInfo()
        });
    } catch (error) {
        // En cas d'échec du paiement
        payment.status = 'failed';
        await payment.save();

        await sendPaymentNotifications(payment, 'failed');

        throw new ApiError(400, 'Le paiement a échoué');
    }
});

// Obtenir les détails d'un paiement
export const getPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
        throw new ApiError(404, 'Paiement non trouvé');
    }

    // Vérifier les autorisations
    if (req.user.role === 'patient' && payment.patient.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Non autorisé à voir ce paiement');
    }
    if (req.user.role === 'doctor' && payment.doctor.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Non autorisé à voir ce paiement');
    }

    res.status(200).json({
        success: true,
        data: payment.getPublicInfo()
    });
});

// Obtenir l'historique des paiements
export const getPaymentHistory = asyncHandler(async (req, res) => {
    const { role } = req.user;
    let query = {};

    // Filtrer selon le rôle
    if (role === 'patient') {
        query.patient = req.user._id;
    } else if (role === 'doctor') {
        query.doctor = req.user._id;
    }

    const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .populate('appointment', 'date startTime endTime')
        .populate('patient', 'firstName lastName')
        .populate('doctor', 'firstName lastName');

    res.status(200).json({
        success: true,
        data: payments.map(payment => payment.getPublicInfo())
    });
});

// Rembourser un paiement (admin uniquement)
export const refundPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
        throw new ApiError(404, 'Paiement non trouvé');
    }

    if (!payment.canBeRefunded()) {
        throw new ApiError(400, 'Ce paiement ne peut pas être remboursé');
    }

    // Simuler le remboursement (à remplacer par l'intégration réelle)
    try {
        // TODO: Intégrer le vrai système de remboursement ici
        await processRefund(payment);

        // Mettre à jour le statut du paiement
        payment.status = 'refunded';
        payment.refundDate = new Date();
        payment.refundReason = reason;
        await payment.save();

        // Mettre à jour le statut du rendez-vous
        const appointment = await Appointment.findById(payment.appointment);
        if (appointment) {
            appointment.paymentStatus = 'refunded';
            await appointment.save();
        }

        // Notifier le patient et le médecin
        await sendPaymentNotifications(payment, 'refunded');

        res.status(200).json({
            success: true,
            data: payment.getPublicInfo()
        });
    } catch (error) {
        throw new ApiError(400, 'Le remboursement a échoué');
    }
});

// Fonction utilitaire pour simuler le traitement du paiement
async function processPayment(payment) {
    // TODO: Remplacer par l'intégration réelle du système de paiement
    return new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
}

// Fonction utilitaire pour simuler le remboursement
async function processRefund(payment) {
    // TODO: Remplacer par l'intégration réelle du système de remboursement
    return new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
}

// Fonction utilitaire pour envoyer les notifications de paiement
async function sendPaymentNotifications(payment, status) {
    const appointment = await Appointment.findById(payment.appointment)
        .populate('patient', 'phone email country')
        .populate('doctor', 'phone email country');

    if (!appointment) return;

    const notificationData = {
        amount: payment.amount,
        currency: payment.currency,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`
    };

    // Notifier le patient
    await sendNotification({
        type: status === 'completed' ? NOTIFICATION_TYPES.PAYMENT_RECEIVED : 
              status === 'failed' ? NOTIFICATION_TYPES.PAYMENT_FAILED :
              NOTIFICATION_TYPES.PAYMENT_REFUNDED,
        recipient: {
            phone: appointment.patient.phone,
            email: appointment.patient.email,
            country: appointment.patient.country
        },
        data: notificationData
    });

    // Notifier le médecin
    await sendNotification({
        type: status === 'completed' ? NOTIFICATION_TYPES.PAYMENT_RECEIVED : 
              status === 'failed' ? NOTIFICATION_TYPES.PAYMENT_FAILED :
              NOTIFICATION_TYPES.PAYMENT_REFUNDED,
        recipient: {
            phone: appointment.doctor.phone,
            email: appointment.doctor.email,
            country: appointment.doctor.country
        },
        data: notificationData
    });
} 