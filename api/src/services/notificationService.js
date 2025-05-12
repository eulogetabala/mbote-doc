import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { formatPhoneNumber } from '../utils/phoneUtils.js';

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Types de notifications supportés
const NOTIFICATION_TYPES = {
    PATIENT_ACCOUNT_CREATION: 'PATIENT_ACCOUNT_CREATION',
    PATIENT_OTP_VERIFICATION: 'PATIENT_OTP_VERIFICATION',
    DOCTOR_ACCOUNT_CREATION: 'DOCTOR_ACCOUNT_CREATION',
    DOCTOR_OTP_VERIFICATION: 'DOCTOR_OTP_VERIFICATION',
    ADMIN_ACCOUNT_CREATION: 'ADMIN_ACCOUNT_CREATION',
    ADMIN_OTP_VERIFICATION: 'ADMIN_OTP_VERIFICATION',
    APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
    APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
    APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    VACATION_REQUEST: 'VACATION_REQUEST',
    VACATION_RESPONSE: 'VACATION_RESPONSE'
};

// Templates de messages
const messageTemplates = {
    [NOTIFICATION_TYPES.PATIENT_ACCOUNT_CREATION]: (data) => ({
        sms: `Bienvenue sur MBOTE! Votre code de vérification est: ${data.otp}. Ce code expirera dans 10 minutes.`,
        email: {
            subject: 'Bienvenue sur MBOTE - Vérification de votre compte',
            text: `Bienvenue sur MBOTE!\n\nVotre code de vérification est: ${data.otp}\nCe code expirera dans 10 minutes.`
        }
    }),
    [NOTIFICATION_TYPES.DOCTOR_ACCOUNT_CREATION]: (data) => ({
        sms: `Bienvenue sur MBOTE Docteur! Votre mot de passe temporaire est: ${data.otp}. Veuillez le changer lors de votre première connexion.`,
        email: {
            subject: 'Bienvenue sur MBOTE - Votre compte médecin',
            text: `Bienvenue sur MBOTE!\n\nVotre compte médecin a été créé avec succès.\nVotre mot de passe temporaire est: ${data.otp}\nVeuillez le changer lors de votre première connexion.`
        }
    }),
    [NOTIFICATION_TYPES.ADMIN_ACCOUNT_CREATION]: (data) => ({
        sms: `Bienvenue sur MBOTE Admin! Votre code de vérification est: ${data.otp}. Ce code expirera dans 10 minutes.`,
        email: {
            subject: 'Bienvenue sur MBOTE Admin - Vérification de votre compte',
            text: `Bienvenue sur MBOTE Admin!\n\nVotre code de vérification est: ${data.otp}\nCe code expirera dans 10 minutes.`
        }
    }),
    [NOTIFICATION_TYPES.PATIENT_OTP_VERIFICATION]: (data) => ({
        sms: `Votre code de vérification MBOTE est: ${data.otp}. Ce code expirera dans 10 minutes.`,
        email: {
            subject: 'Vérification de votre compte MBOTE',
            text: `Votre code de vérification est: ${data.otp}\nCe code expirera dans 10 minutes.`
        }
    }),
    [NOTIFICATION_TYPES.ADMIN_OTP_VERIFICATION]: (data) => ({
        sms: `Votre code de vérification MBOTE Admin est: ${data.otp}. Ce code expirera dans 10 minutes.`,
        email: {
            subject: 'Vérification de votre compte MBOTE Admin',
            text: `Votre code de vérification est: ${data.otp}\nCe code expirera dans 10 minutes.`
        }
    }),
    [NOTIFICATION_TYPES.APPOINTMENT_CREATED]: (data) => ({
        sms: `Nouveau rendez-vous MBOTE avec ${data.doctorName || data.patientName} le ${data.date} à ${data.startTime}.`,
        email: {
            subject: 'Nouveau rendez-vous MBOTE',
            text: `Un nouveau rendez-vous a été créé avec ${data.doctorName || data.patientName} le ${data.date} à ${data.startTime}.`
        }
    }),
    [NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED]: (data) => ({
        sms: `Votre rendez-vous MBOTE du ${data.date} à ${data.startTime} a été confirmé.`,
        email: {
            subject: 'Rendez-vous confirmé - MBOTE',
            text: `Votre rendez-vous du ${data.date} à ${data.startTime} a été confirmé.`
        }
    }),
    [NOTIFICATION_TYPES.APPOINTMENT_CANCELLED]: (data) => ({
        sms: `Votre rendez-vous MBOTE du ${data.date} à ${data.startTime} a été annulé. Raison: ${data.reason}`,
        email: {
            subject: 'Rendez-vous annulé - MBOTE',
            text: `Votre rendez-vous du ${data.date} à ${data.startTime} a été annulé.\nRaison: ${data.reason}`
        }
    }),
    [NOTIFICATION_TYPES.VACATION_REQUEST]: (data) => ({
        sms: `Nouvelle demande de congé de Dr. ${data.doctorName} du ${new Date(data.startDate).toLocaleDateString()} au ${new Date(data.endDate).toLocaleDateString()}. Raison: ${data.reason}`,
        email: {
            subject: 'Nouvelle demande de congé',
            text: `Dr. ${data.doctorName} a demandé un congé du ${new Date(data.startDate).toLocaleDateString()} au ${new Date(data.endDate).toLocaleDateString()}.\n\nRaison: ${data.reason}\n\nVeuillez traiter cette demande dans le panneau d'administration.`
        }
    }),
    [NOTIFICATION_TYPES.VACATION_RESPONSE]: (data) => ({
        sms: `Votre demande de congé du ${new Date(data.startDate).toLocaleDateString()} au ${new Date(data.endDate).toLocaleDateString()} a été ${data.status === 'approved' ? 'approuvée' : 'rejetée'}.`,
        email: {
            subject: `Demande de congé ${data.status === 'approved' ? 'approuvée' : 'rejetée'}`,
            text: `Votre demande de congé du ${new Date(data.startDate).toLocaleDateString()} au ${new Date(data.endDate).toLocaleDateString()} a été ${data.status === 'approved' ? 'approuvée' : 'rejetée'}.\n\nRaison: ${data.reason}`
        }
    })
};

/**
 * Envoie une notification (SMS et/ou email)
 * @param {Object} options - Options de notification
 * @param {string} options.type - Type de notification
 * @param {Object} options.recipient - Informations du destinataire
 * @param {string} options.recipient.phone - Numéro de téléphone
 * @param {string} options.recipient.country - Pays du destinataire
 * @param {string} [options.recipient.email] - Email du destinataire (optionnel)
 * @param {Object} options.data - Données pour le template
 */
export const sendNotification = async (options) => {
    const { type, recipient, data } = options;
    const template = messageTemplates[type];

    if (!template) {
        throw new Error(`Type de notification non supporté: ${type}`);
    }

    try {
        // Envoi du SMS
        if (recipient.phone) {
            const phoneValidation = formatPhoneNumber(recipient.phone, recipient.country);
            if (phoneValidation.isValid) {
                console.log('\n=== NOTIFICATION SMS ===');
                console.log('À:', phoneValidation.formattedNumber);
                console.log('Message:', template(data).sms);
                console.log('=======================\n');

                if (process.env.TWILIO_PHONE_NUMBER) {
                    await twilioClient.messages.create({
                        body: template(data).sms,
                        to: phoneValidation.formattedNumber,
                        from: process.env.TWILIO_PHONE_NUMBER
                    });
                } else {
                    console.log('\n=== SIMULATION SMS ===');
                    console.log('📱 Numéro de téléphone:', phoneValidation.formattedNumber);
                    console.log('📝 Message:', template(data).sms);
                    console.log('=====================\n');
                }
            } else {
                console.error(`Numéro de téléphone invalide: ${recipient.phone}`);
            }
        }

        // Envoi de l'email si fourni
        if (recipient.email) {
            const emailTemplate = template(data).email;
            await emailTransporter.sendMail({
                from: process.env.SMTP_FROM,
                to: recipient.email,
                subject: emailTemplate.subject,
                text: emailTemplate.text
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
        // On ne propage pas l'erreur pour ne pas bloquer le processus
    }
};

export default {
    sendNotification
};