import crypto from 'crypto';
import mongoose from 'mongoose';

// Schéma pour stocker les OTP
const otpSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Supprimer les OTP expirés automatiquement
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

/**
 * Génère un code OTP à 6 chiffres
 * @param {string} phone - Le numéro de téléphone
 * @returns {string} - Le code OTP généré
 */
export const generateOTP = async (phone) => {
    try {
        console.log('\n=== GÉNÉRATION OTP ===');
        console.log('Pour le numéro:', phone);

        // Supprimer l'ancien OTP s'il existe
        const deleted = await OTP.deleteOne({ phone });
        console.log('Ancien OTP supprimé:', deleted.deletedCount > 0);

        // Générer un code à 6 chiffres
        const otp = crypto.randomInt(100000, 999999).toString();
        console.log('Nouveau code OTP généré:', otp);
        
        // Stocker l'OTP avec une expiration de 10 minutes
        const newOTP = await OTP.create({
            phone,
            code: otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        });
        console.log('OTP sauvegardé dans la base de données:', newOTP._id);

        // Vérifier que l'OTP a bien été sauvegardé
        const savedOTP = await OTP.findOne({ phone });
        console.log('Vérification de sauvegarde:', savedOTP ? 'OK' : 'ÉCHEC');
        console.log('=======================\n');

        return otp;
    } catch (error) {
        console.error('Erreur lors de la génération de l\'OTP:', error);
        throw error;
    }
};

/**
 * Vérifie si un code OTP est valide
 * @param {string} phone - Le numéro de téléphone
 * @param {string} otp - Le code OTP à vérifier
 * @returns {boolean} - True si le code est valide
 */
export const verifyOTP = async (phone, otp) => {
    try {
        console.log('\n=== VÉRIFICATION OTP ===');
        console.log('Pour le numéro:', phone);
        console.log('Code OTP reçu:', otp);

        // Vérifier la connexion à MongoDB
        console.log('État de la connexion MongoDB:', mongoose.connection.readyState === 1 ? 'Connecté' : 'Déconnecté');

        const storedOTP = await OTP.findOne({ phone });
        console.log('Code OTP stocké:', storedOTP ? storedOTP.code : null);
        console.log('Date d\'expiration:', storedOTP ? storedOTP.expiresAt : null);

        if (!storedOTP) {
            console.log('Aucun OTP trouvé pour ce numéro');
            console.log('=======================\n');
            return false;
        }

        if (Date.now() > storedOTP.expiresAt.getTime()) {
            console.log('OTP expiré');
            await OTP.deleteOne({ phone });
            console.log('=======================\n');
            return false;
        }

        const isValid = storedOTP.code === otp;
        if (isValid) {
            console.log('OTP valide');
            await OTP.deleteOne({ phone }); // Supprimer l'OTP après utilisation
        } else {
            console.log('OTP invalide');
        }

        console.log('=======================\n');
        return isValid;
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'OTP:', error);
        return false;
    }
}; 