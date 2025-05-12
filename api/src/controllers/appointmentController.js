import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { sendNotification } from '../services/notificationService.js';

// Créer un nouveau rendez-vous
export const createAppointment = async (req, res) => {
    try {
        console.log('\n=== CRÉATION RENDEZ-VOUS ===');
        const { doctorId, date, startTime, endTime, type, reason, notes } = req.body;
        const patientId = req.user.id;

        console.log('Données reçues:', { doctorId, date, startTime, endTime, type, reason });

        // Vérifier si le médecin existe
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            console.log('Médecin non trouvé');
            return res.status(404).json({
                success: false,
                message: 'Médecin non trouvé'
            });
        }

        // Vérifier si le patient existe
        const patient = await Patient.findById(patientId);
        if (!patient) {
            console.log('Patient non trouvé');
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        // Vérifier la disponibilité du médecin
        const existingAppointment = await Appointment.findOne({
            doctor: doctorId,
            date,
            startTime,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            console.log('Créneau déjà réservé');
            return res.status(400).json({
                success: false,
                message: 'Ce créneau est déjà réservé'
            });
        }

        // Créer le rendez-vous
        const appointment = await Appointment.create({
            patient: patientId,
            doctor: doctorId,
            date,
            startTime,
            endTime,
            type,
            reason,
            notes,
            paymentAmount: doctor.consultationFee
        });

        console.log('Rendez-vous créé avec succès:', appointment._id);

        // Notifier le médecin
        await sendNotification({
            type: 'APPOINTMENT_CREATED',
            recipient: {
                phone: doctor.phone,
                country: 'CG'
            },
            data: {
                appointmentId: appointment._id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                date,
                startTime
            }
        });

        // Notifier le patient
        await sendNotification({
            type: 'APPOINTMENT_CREATED',
            recipient: {
                phone: patient.phone,
                country: 'CG'
            },
            data: {
                appointmentId: appointment._id,
                doctorName: `${doctor.firstName} ${doctor.lastName}`,
                date,
                startTime
            }
        });

        console.log('Notifications envoyées');
        console.log('===========================\n');

        res.status(201).json({
            success: true,
            message: 'Rendez-vous créé avec succès',
            data: appointment.toPublicJSON()
        });
    } catch (error) {
        console.error('Erreur lors de la création du rendez-vous:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Obtenir les rendez-vous d'un patient
export const getPatientAppointments = async (req, res) => {
    try {
        const patientId = req.user.id;
        const appointments = await Appointment.find({ patient: patientId })
            .populate('doctor', 'firstName lastName specialization')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json({
            success: true,
            data: appointments
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Obtenir les rendez-vous d'un médecin
export const getDoctorAppointments = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const appointments = await Appointment.find({ doctor: doctorId })
            .populate('patient', 'firstName lastName phone')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json({
            success: true,
            data: appointments
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Confirmer un rendez-vous (médecin uniquement)
export const confirmAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const doctorId = req.user.id;

        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Rendez-vous non trouvé'
            });
        }

        appointment.status = 'confirmed';
        await appointment.save();

        // Notifier le patient
        const patient = await Patient.findById(appointment.patient);
        await sendNotification({
            type: 'APPOINTMENT_CONFIRMED',
            recipient: {
                phone: patient.phone,
                country: 'CG'
            },
            data: {
                appointmentId: appointment._id,
                date: appointment.date,
                startTime: appointment.startTime
            }
        });

        res.status(200).json({
            success: true,
            message: 'Rendez-vous confirmé avec succès',
            data: appointment.toPublicJSON()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Annuler un rendez-vous
export const cancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Rendez-vous non trouvé'
            });
        }

        // Vérifier si l'utilisateur a le droit d'annuler
        if (appointment.patient.toString() !== userId && appointment.doctor.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Vous n\'avez pas le droit d\'annuler ce rendez-vous'
            });
        }

        // Vérifier si le rendez-vous peut être annulé
        if (!appointment.canBeCancelled()) {
            return res.status(400).json({
                success: false,
                message: 'Le rendez-vous ne peut plus être annulé'
            });
        }

        appointment.status = 'cancelled';
        appointment.cancellationReason = reason;
        appointment.cancelledBy = userId;
        appointment.cancellationDate = new Date();
        await appointment.save();

        // Notifier l'autre partie
        const [patient, doctor] = await Promise.all([
            Patient.findById(appointment.patient),
            Doctor.findById(appointment.doctor)
        ]);

        const notificationData = {
            appointmentId: appointment._id,
            date: appointment.date,
            startTime: appointment.startTime,
            reason
        };

        if (userId === appointment.patient.toString()) {
            // Si le patient annule, notifier le médecin
            await sendNotification({
                type: 'APPOINTMENT_CANCELLED',
                recipient: {
                    phone: doctor.phone,
                    country: 'CG'
                },
                data: notificationData
            });
        } else {
            // Si le médecin annule, notifier le patient
            await sendNotification({
                type: 'APPOINTMENT_CANCELLED',
                recipient: {
                    phone: patient.phone,
                    country: 'CG'
                },
                data: notificationData
            });
        }

        res.status(200).json({
            success: true,
            message: 'Rendez-vous annulé avec succès',
            data: appointment.toPublicJSON()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Marquer un rendez-vous comme terminé (médecin uniquement)
export const completeAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const doctorId = req.user.id;

        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Rendez-vous non trouvé'
            });
        }

        appointment.status = 'completed';
        await appointment.save();

        // Notifier le patient
        const patient = await Patient.findById(appointment.patient);
        await sendNotification({
            type: 'APPOINTMENT_COMPLETED',
            recipient: {
                phone: patient.phone,
                country: 'CG'
            },
            data: {
                appointmentId: appointment._id,
                date: appointment.date
            }
        });

        res.status(200).json({
            success: true,
            message: 'Rendez-vous marqué comme terminé',
            data: appointment.toPublicJSON()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 