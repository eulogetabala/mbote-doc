import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Admin from '../models/Admin.js';

// Générer un token JWT
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// Vérifier le mot de passe
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Hasher le mot de passe
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Authentifier un utilisateur
export const authenticateUser = async (phone, password) => {
    try {
        // Trouver l'utilisateur par téléphone
        const user = await User.findOne({ phone });
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // Vérifier si l'utilisateur est actif
        if (!user.isActive) {
            throw new Error('Compte désactivé');
        }

        // Vérifier le mot de passe
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Mot de passe incorrect');
        }

        // Générer le token
        const token = generateToken(user._id);

        // Récupérer les détails spécifiques selon le rôle
        let userDetails;
        switch (user.role) {
            case 'doctor':
                userDetails = await Doctor.findById(user._id);
                break;
            case 'patient':
                userDetails = await Patient.findById(user._id);
                break;
            case 'admin':
                userDetails = await Admin.findById(user._id);
                break;
            default:
                userDetails = user;
        }

        return {
            token,
            user: {
                id: user._id,
                role: user.role,
                phone: user.phone,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                ...userDetails.toObject()
            }
        };
    } catch (error) {
        throw error;
    }
};

// Changer le mot de passe
export const changePassword = async (userId, currentPassword, newPassword) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // Vérifier l'ancien mot de passe
        const isPasswordValid = await verifyPassword(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Mot de passe actuel incorrect');
        }

        // Hasher et sauvegarder le nouveau mot de passe
        user.password = await hashPassword(newPassword);
        await user.save();

        return true;
    } catch (error) {
        throw error;
    }
};

// Réinitialiser le mot de passe
export const resetPassword = async (userId, newPassword) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // Hasher et sauvegarder le nouveau mot de passe
        user.password = await hashPassword(newPassword);
        await user.save();

        return true;
    } catch (error) {
        throw error;
    }
}; 