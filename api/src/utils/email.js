import nodemailer from 'nodemailer';
import { AppError } from './AppError.js';

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Vérifier la connexion au serveur SMTP
const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('Serveur SMTP connecté avec succès');
    } catch (error) {
        console.error('Erreur de connexion au serveur SMTP:', error);
        throw new AppError('Erreur de configuration du service email', 500);
    }
};

// Envoyer un email
export const sendEmail = async (to, { subject, text, html }) => {
    try {
        // Vérifier la connexion avant d'envoyer
        await verifyConnection();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
            html: html || text // Utiliser le HTML si fourni, sinon utiliser le texte
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email envoyé:', info.messageId);
        return info;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        throw new AppError('Erreur lors de l\'envoi de l\'email', 500);
    }
}; 