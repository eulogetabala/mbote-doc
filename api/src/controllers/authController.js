import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Admin from '../models/Admin.js';
import { sendSMS } from '../utils/sms.js';
import { sendEmail } from '../utils/email.js';
import { AppError } from '../utils/AppError.js';

// Générer un token JWT
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// Connexion
export const login = async (req, res, next) => {
    try {
        const { phone, password } = req.body;
        
        console.log('\n=== TENTATIVE DE LOGIN ===');
        console.log('Numéro de téléphone:', phone);
        
        // Vérifier si l'utilisateur existe et inclure le mot de passe
        const user = await User.findOne({ phone }).select('+password');
        console.log('Utilisateur trouvé:', user ? 'Oui' : 'Non');
        
        if (!user) {
            console.log('Aucun utilisateur trouvé avec ce numéro');
            console.log('===========================\n');
            return next(new AppError('Numéro de téléphone ou mot de passe incorrect', 401));
        }

        // Vérifier si le compte est actif
        console.log('Compte actif:', user.isActive);
        if (!user.isActive) {
            console.log('Compte désactivé');
            console.log('===========================\n');
            return next(new AppError('Votre compte a été désactivé. Veuillez contacter l\'administrateur.', 401));
        }

        // Vérifier si le compte est vérifié
        console.log('Compte vérifié:', user.isVerified);
        if (!user.isVerified) {
            console.log('Compte non vérifié');
            console.log('===========================\n');
            return res.status(403).json({
                success: false,
                message: 'Veuillez vérifier votre numéro de téléphone avec le code OTP avant de vous connecter'
            });
        }

        // Vérifier le mot de passe
        console.log('Vérification du mot de passe...');
        const isMatch = await user.comparePassword(password);
        console.log('Mot de passe correct:', isMatch);
        
        if (!isMatch) {
            console.log('Mot de passe incorrect');
            console.log('===========================\n');
            return next(new AppError('Numéro de téléphone ou mot de passe incorrect', 401));
        }

        console.log('Login réussi');
        console.log('===========================\n');

        // Vérifier si le mot de passe doit être changé (pour les médecins)
        if (user.role === 'doctor') {
            const doctor = await Doctor.findById(user._id);
            if (doctor && !doctor.passwordChanged) {
                return res.status(200).json({
                    success: true,
                    message: 'Vous devez changer votre mot de passe',
                    data: {
                        token: generateToken(user._id),
                        user: {
                            id: user._id,
                            role: user.role,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            phone: user.phone,
                            email: user.email,
                            mustChangePassword: true
                        }
                    }
                });
            }
        }

        // Générer le token
        const token = generateToken(user._id);

        // Retourner les informations de l'utilisateur
        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    email: user.email
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Changer le mot de passe
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        // Vérifier l'ancien mot de passe
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return next(new AppError('Mot de passe actuel incorrect', 401));
        }

        // Hasher le nouveau mot de passe
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Si c'est un médecin, marquer le mot de passe comme changé
        if (user.role === 'doctor') {
            const doctor = await Doctor.findById(user._id);
            if (doctor) {
                doctor.passwordChanged = true;
                await doctor.save();
            }
        }

        await user.save();

        // Envoyer une notification
        const message = `Votre mot de passe a été modifié avec succès. Si vous n'êtes pas à l'origine de cette modification, veuillez contacter l'administrateur.`;
        await sendSMS(user.phone, message);
        
        if (user.email) {
            const emailContent = emailTemplates.passwordChange(`${user.firstName} ${user.lastName}`);
            await sendEmail({
                to: user.email,
                ...emailContent
            });
        }

        res.status(200).json({
            success: true,
            message: 'Mot de passe modifié avec succès'
        });
    } catch (error) {
        next(error);
    }
};

// Réinitialiser le mot de passe (admin uniquement)
export const resetPassword = async (req, res, next) => {
    try {
        const { userId, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return next(new AppError('Utilisateur non trouvé', 404));
        }

        // Hasher le nouveau mot de passe
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Si c'est un médecin, marquer le mot de passe comme changé
        if (user.role === 'doctor') {
            const doctor = await Doctor.findById(user._id);
            if (doctor) {
                doctor.passwordChanged = true;
                await doctor.save();
            }
        }

        await user.save();

        // Envoyer une notification
        const message = `Votre mot de passe a été réinitialisé. Veuillez vous connecter avec votre nouveau mot de passe.`;
        await sendSMS(user.phone, message);
        
        if (user.email) {
            const emailContent = emailTemplates.passwordReset(`${user.firstName} ${user.lastName}`, newPassword);
            await sendEmail({
                to: user.email,
                ...emailContent
            });
        }

        res.status(200).json({
            success: true,
            message: 'Mot de passe réinitialisé avec succès'
        });
    } catch (error) {
        next(error);
    }
};

// Vérification du token
export const verifyToken = async (req, res) => {
    try {
        // Si le middleware d'authentification a réussi, le token est valide
        res.status(200).json({
            success: true,
            data: {
                user: req.user
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token invalide'
        });
    }
}; 