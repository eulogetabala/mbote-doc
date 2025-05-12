import Admin from '../models/Admin.js';
import User from '../models/User.js';
import { formatPhoneNumber } from '../utils/phoneUtils.js';
import { generateOTP, verifyOTP } from '../services/otp.js';
import { sendNotification } from '../services/notificationService.js';

// Créer le compte administrateur initial
export const createInitialAdmin = async (req, res) => {
    try {
        console.log('\n=== CRÉATION ADMINISTRATEUR ===');
        console.log('Données reçues:', req.body);

        // Supprimer tous les utilisateurs existants
        await User.deleteMany({});
        console.log('Tous les utilisateurs ont été supprimés');

        const { phone, password, firstName, lastName, email, countryCode = 'CD' } = req.body;

        // Valider et formater le numéro de téléphone
        console.log('Validation du numéro de téléphone...');
        const phoneValidation = formatPhoneNumber(phone, countryCode);
        console.log('Résultat de la validation:', phoneValidation);

        if (!phoneValidation.isValid) {
            console.log('Numéro de téléphone invalide');
            return res.status(400).json({
                success: false,
                message: phoneValidation.error
            });
        }

        console.log('Création de l\'administrateur...');
        // Créer l'administrateur avec tous les droits
        const admin = await Admin.create({
            phone: phoneValidation.formattedNumber,
            password,
            firstName,
            lastName,
            email,
            role: 'admin',
            isVerified: false,
            isActive: false,
            permissions: [
                'manage_users',
                'manage_doctors',
                'manage_appointments',
                'manage_payments',
                'view_statistics',
                'manage_specialties',
                'manage_settings'
            ]
        });
        console.log('Administrateur créé avec succès:', admin._id);

        // Générer et envoyer l'OTP
        console.log('Génération de l\'OTP...');
        const otp = await generateOTP(admin.phone);
        console.log('OTP généré:', otp);

        console.log('Envoi de la notification...');
        await sendNotification({
            type: 'PATIENT_ACCOUNT_CREATION',
            recipient: {
                phone: admin.phone,
                country: phoneValidation.country
            },
            data: {
                otp,
                adminId: admin._id
            }
        });
        console.log('Notification envoyée');

        console.log('===========================\n');
        res.status(201).json({
            success: true,
            message: 'Compte administrateur créé avec succès. Veuillez vérifier votre numéro de téléphone avec le code OTP.',
            data: {
                adminId: admin._id,
                phone: admin.phone
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'administrateur:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Vérifier l'OTP de l'administrateur
export const verifyAdminOTP = async (req, res) => {
    try {
        console.log('\n=== VÉRIFICATION OTP ADMIN ===');
        const { phone, otp } = req.body;
        console.log('Numéro de téléphone:', phone);
        console.log('OTP reçu:', otp);

        const admin = await Admin.findOne({ phone });
        if (!admin) {
            console.log('Administrateur non trouvé');
            return res.status(404).json({
                success: false,
                message: 'Administrateur non trouvé'
            });
        }
        console.log('Administrateur trouvé:', admin._id);

        const isValid = await verifyOTP(phone, otp);
        console.log('OTP valide:', isValid);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Code OTP invalide ou expiré'
            });
        }

        // Activer le compte
        admin.isVerified = true;
        admin.isActive = true;
        await admin.save();
        console.log('Compte activé avec succès');

        console.log('===========================\n');
        res.status(200).json({
            success: true,
            message: 'Compte administrateur vérifié et activé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la vérification OTP:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 