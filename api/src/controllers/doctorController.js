import Doctor from '../models/Doctor.js';
import { sendNotification } from '../services/notificationService.js';
import * as locationService from '../services/locationService.js';
import * as authService from '../services/authService.js';

// Créer un nouveau médecin (Admin uniquement)
export const createDoctor = async (req, res) => {
    try {
        const {
            phone,
            firstName,
            lastName,
            email,
            specialization,
            licenseNumber,
            consultationFee
        } = req.body;

        // Vérifier si le médecin existe déjà
        const existingDoctor = await Doctor.findOne({ phone });
        if (existingDoctor) {
            return res.status(400).json({
                success: false,
                message: 'Un médecin avec ce numéro de téléphone existe déjà'
            });
        }

        // Générer un mot de passe temporaire
        const temporaryPassword = Math.random().toString(36).slice(-8);

        // Créer le médecin
        const doctor = await Doctor.create({
            phone,
            firstName,
            lastName,
            email,
            specialization,
            licenseNumber,
            consultationFee,
            temporaryPassword,
            password: temporaryPassword, // Sera hashé par le middleware
            registrationStatus: 'pending',
            registrationDate: new Date(),
            role: 'doctor',
            isActive: true,
            languages: ['Français'], // Langue par défaut
            education: [], // À compléter plus tard
            verificationDocuments: [], // À compléter plus tard
            availability: {
                monday: { start: '08:00', end: '17:00' },
                tuesday: { start: '08:00', end: '17:00' },
                wednesday: { start: '08:00', end: '17:00' },
                thursday: { start: '08:00', end: '17:00' },
                friday: { start: '08:00', end: '17:00' }
            }
        });

        // Envoyer les identifiants par SMS et email
        await sendNotification({
            type: 'DOCTOR_ACCOUNT_CREATION',
            recipient: {
                phone: doctor.phone,
                email: doctor.email,
                country: 'CG'
            },
            data: {
                otp: temporaryPassword
            }
        });

        res.status(201).json({
            success: true,
            data: {
                doctor: {
                    id: doctor._id,
                    phone: doctor.phone,
                    firstName: doctor.firstName,
                    lastName: doctor.lastName,
                    specialization: doctor.specialization,
                    registrationStatus: doctor.registrationStatus
                }
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Approuver un médecin (Admin uniquement)
export const approveDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médecin non trouvé'
            });
        }

        doctor.registrationStatus = 'approved';
        doctor.approvedBy = req.user.id;
        doctor.approvalDate = new Date();
        await doctor.save();

        // Envoyer la notification d'approbation
        await notificationService.doctorNotifications.accountApproved(doctor);

        res.status(200).json({
            success: true,
            message: 'Médecin approuvé avec succès'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Rejeter un médecin (Admin uniquement)
export const rejectDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { reason } = req.body;

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médecin non trouvé'
            });
        }

        doctor.registrationStatus = 'rejected';
        doctor.rejectionReason = reason;
        await doctor.save();

        // Envoyer la notification de rejet
        await notificationService.doctorNotifications.accountRejected(doctor, reason);

        res.status(200).json({
            success: true,
            message: 'Médecin rejeté avec succès'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Mettre à jour la localisation d'un médecin
export const updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const doctorId = req.user.id;

        const doctor = await locationService.updateDoctorLocation(doctorId, latitude, longitude);

        res.status(200).json({
            success: true,
            data: {
                location: doctor.location
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Obtenir la liste des médecins
export const listDoctors = async (req, res) => {
    try {
        const { status, specialization } = req.query;
        let query = {};

        if (status) {
            query.registrationStatus = status;
        }
        if (specialization) {
            query.specialization = specialization;
        }

        const doctors = await Doctor.find(query)
            .select('-password -temporaryPassword')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                doctors
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Obtenir les détails d'un médecin
export const getDoctorDetails = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const doctor = await Doctor.findById(doctorId)
            .select('-password -temporaryPassword');

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médecin non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                doctor
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 