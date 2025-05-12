import twilio from 'twilio';
import { AppError } from './AppError.js';

// Initialiser le client Twilio
const client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Envoyer un SMS
export const sendSMS = async (to, message) => {
    try {
        const response = await client.messages.create({
            body: message,
            to: to,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        console.log('SMS envoyé:', response.sid);
        return response;
    } catch (error) {
        console.error('Erreur lors de l\'envoi du SMS:', error);
        throw new AppError('Erreur lors de l\'envoi du SMS', 500);
    }
};

// Vérifier un numéro de téléphone
export const verifyPhoneNumber = async (phoneNumber) => {
    try {
        const verification = await client.verify.v2
            .services(process.env.TWILIO_SERVICE_SID)
            .verifications.create({ to: phoneNumber, channel: 'sms' });

        console.log('Vérification initiée:', verification.sid);
        return verification;
    } catch (error) {
        console.error('Erreur lors de la vérification du numéro:', error);
        throw new AppError('Erreur lors de la vérification du numéro', 500);
    }
};

// Vérifier un code de vérification
export const checkVerificationCode = async (phoneNumber, code) => {
    try {
        const verificationCheck = await client.verify.v2
            .services(process.env.TWILIO_SERVICE_SID)
            .verificationChecks.create({ to: phoneNumber, code: code });

        return verificationCheck.status === 'approved';
    } catch (error) {
        console.error('Erreur lors de la vérification du code:', error);
        throw new AppError('Erreur lors de la vérification du code', 500);
    }
}; 