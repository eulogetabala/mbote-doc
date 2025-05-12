import Patient from '../models/Patient.js';
import * as notificationService from '../services/notificationService.js';
import * as locationService from '../services/locationService.js';
import { generateOTP, verifyOTP } from '../utils/otp.js';
import { sendNotification } from '../services/notificationService.js';
import { formatPhoneNumber } from '../utils/phoneUtils.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Générer un token JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Inscription d'un nouveau patient
export const registerPatient = async (req, res) => {
    try {
        const { phone, password, countryCode = 'CD' } = req.body;

        console.log('\n=== INSCRIPTION PATIENT ===');
        console.log('Numéro de téléphone:', phone);

        // Vérifier si le patient existe déjà
        const existingPatient = await Patient.findOne({ phone });
        if (existingPatient) {
            console.log('Patient déjà existant');
            console.log('===========================\n');
            return res.status(400).json({
                success: false,
                message: 'Un compte existe déjà avec ce numéro de téléphone'
            });
        }

        // Valider et formater le numéro de téléphone
        const phoneValidation = formatPhoneNumber(phone, countryCode);
        if (!phoneValidation.isValid) {
            console.log('Numéro de téléphone invalide');
            console.log('===========================\n');
            return res.status(400).json({
                success: false,
                message: phoneValidation.error
            });
        }

        // Créer le nouveau patient
        const patient = await Patient.create({
            phone: phoneValidation.formattedNumber,
            password, // Le mot de passe sera hashé automatiquement par le modèle
            isVerified: false,
            isActive: false
        });

        console.log('Patient créé avec succès');
        console.log('ID:', patient._id);
        console.log('===========================\n');

        // Générer et envoyer l'OTP
        const otp = await generateOTP(patient.phone);
        await sendNotification({
            type: 'PATIENT_ACCOUNT_CREATION',
            recipient: {
                phone: patient.phone,
                country: phoneValidation.country
            },
            data: {
                otp,
                patientId: patient._id
            }
        });

        res.status(201).json({
            success: true,
            message: 'Inscription réussie. Veuillez vérifier votre numéro de téléphone.',
            data: {
                patientId: patient._id,
                phone: patient.phone,
                country: phoneValidation.country
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'inscription',
            error: error.message
        });
    }
};

// Vérification du code OTP
export const verifyPatientOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Vérifier le code OTP
        const isValid = await verifyOTP(phone, otp);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Code OTP invalide'
            });
        }

        // Mettre à jour le statut de vérification et d'activation du patient
        const patient = await Patient.findOneAndUpdate(
            { phone },
            { 
                isVerified: true,
                isActive: true
            },
            { new: true }
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Numéro de téléphone vérifié avec succès. Vous pouvez maintenant vous connecter.',
            data: {
                patient: {
                    id: patient._id,
                    phone: patient.phone,
                    isVerified: patient.isVerified,
                    isActive: patient.isActive
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de la vérification OTP:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Compléter le profil patient
export const completePatientProfile = async (req, res) => {
    try {
        const { patientId } = req.params;
        const {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            address,
            photo
        } = req.body;

        // Vérifier si le patient existe
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        // Vérifier si l'utilisateur est autorisé à modifier ce profil
        if (req.user.id !== patientId) {
            return res.status(403).json({
                success: false,
                message: 'Non autorisé à modifier ce profil'
            });
        }

        // Mettre à jour le profil
        const updatedPatient = await Patient.findByIdAndUpdate(
            patientId,
            {
                firstName,
                lastName,
                dateOfBirth,
                gender,
                address,
                photo,
                isProfileComplete: true
            },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            data: {
                patient: updatedPatient
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Mettre à jour les informations d'un patient
export const updatePatient = async (req, res) => {
    try {
        const { patientId } = req.params;
        const updateData = req.body;

        // Vérifier si le patient existe
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        // Vérifier si l'utilisateur est autorisé à modifier ce patient
        if (req.user.role !== 'admin' && req.user.id !== patientId) {
            return res.status(403).json({
                success: false,
                message: 'Non autorisé à modifier ce patient'
            });
        }

        // Mettre à jour le patient
        const updatedPatient = await Patient.findByIdAndUpdate(
            patientId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            data: {
                patient: updatedPatient
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Obtenir la liste des médecins à proximité
export const findNearbyDoctors = async (req, res) => {
    try {
        const { latitude, longitude, maxDistance, specialization } = req.query;

        const doctors = await locationService.findNearbyDoctors(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(maxDistance) || 10,
            specialization
        );

        res.status(200).json({
            success: true,
            data: {
                doctors: doctors.map(doctor => ({
                    id: doctor._id,
                    firstName: doctor.firstName,
                    lastName: doctor.lastName,
                    specialization: doctor.specialization,
                    consultationFee: doctor.consultationFee,
                    location: doctor.location
                }))
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Obtenir les détails d'un patient
export const getPatientDetails = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Vérifier si l'utilisateur est autorisé à voir ces détails
        if (req.user.role !== 'admin' && req.user.id !== patientId) {
            return res.status(403).json({
                success: false,
                message: 'Non autorisé à voir ces détails'
            });
        }

        const patient = await Patient.findById(patientId)
            .select('-password');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                patient
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Désactiver un compte patient
export const deactivatePatient = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Vérifier si l'utilisateur est un admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non autorisé à désactiver des comptes'
            });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        patient.isActive = false;
        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Compte patient désactivé avec succès'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 