import redis from '../config/redis.js';

const OTP_EXPIRY = 5 * 60; // 5 minutes en secondes

// Générer un code OTP
export const generateOTP = async (phone) => {
    try {
        // Générer un code OTP à 6 chiffres
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        console.log('\n=== GÉNÉRATION OTP ===');
        console.log('Pour le numéro:', phone);
        console.log('Code OTP:', otp);
        console.log('=====================\n');
        
        // Stocker le code OTP dans Redis avec une expiration
        await redis.set(`otp:${phone}`, otp, 'EX', OTP_EXPIRY);
        
        return otp;
    } catch (error) {
        console.error('Erreur lors de la génération de l\'OTP:', error);
        throw new Error('Impossible de générer le code OTP');
    }
};

// Vérifier un code OTP
export const verifyOTP = async (phone, otp) => {
    try {
        console.log('\n=== VÉRIFICATION OTP ===');
        console.log('Pour le numéro:', phone);
        console.log('Code OTP reçu:', otp);
        
        // Récupérer le code OTP stocké
        const storedOTP = await redis.get(`otp:${phone}`);
        console.log('Code OTP stocké:', storedOTP);
        
        if (!storedOTP) {
            console.log('Aucun OTP trouvé pour ce numéro');
            console.log('=======================\n');
            return false;
        }
        
        // Vérifier si le code correspond
        const isValid = storedOTP === otp;
        console.log('OTP valide:', isValid);
        
        // Si valide, supprimer le code OTP
        if (isValid) {
            await redis.del(`otp:${phone}`);
            console.log('OTP supprimé après vérification');
        }
        
        console.log('=======================\n');
        return isValid;
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'OTP:', error);
        throw new Error('Impossible de vérifier le code OTP');
    }
}; 