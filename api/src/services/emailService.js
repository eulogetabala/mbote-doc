import nodemailer from 'nodemailer';
import { AppError } from '../utils/AppError.js';

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
export const sendEmail = async ({ to, subject, text, html }) => {
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

// Templates d'emails
export const emailTemplates = {
    // Template pour le changement de mot de passe
    passwordChange: (name) => ({
        subject: 'Changement de mot de passe',
        html: `
            <h1>Changement de mot de passe</h1>
            <p>Bonjour ${name},</p>
            <p>Votre mot de passe a été modifié avec succès.</p>
            <p>Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement l'administrateur.</p>
            <p>Cordialement,<br>L'équipe Mbote-Doc</p>
        `
    }),

    // Template pour la réinitialisation du mot de passe
    passwordReset: (name, newPassword) => ({
        subject: 'Réinitialisation de mot de passe',
        html: `
            <h1>Réinitialisation de mot de passe</h1>
            <p>Bonjour ${name},</p>
            <p>Votre mot de passe a été réinitialisé.</p>
            <p>Votre nouveau mot de passe temporaire est : <strong>${newPassword}</strong></p>
            <p>Pour des raisons de sécurité, veuillez changer ce mot de passe lors de votre prochaine connexion.</p>
            <p>Cordialement,<br>L'équipe Mbote-Doc</p>
        `
    }),

    // Template pour l'approbation d'un médecin
    doctorApproval: (name) => ({
        subject: 'Compte médecin approuvé',
        html: `
            <h1>Compte approuvé</h1>
            <p>Bonjour ${name},</p>
            <p>Votre compte médecin a été approuvé avec succès.</p>
            <p>Vous pouvez maintenant vous connecter à votre compte et commencer à utiliser la plateforme.</p>
            <p>Cordialement,<br>L'équipe Mbote-Doc</p>
        `
    }),

    // Template pour le rejet d'un médecin
    doctorRejection: (name, reason) => ({
        subject: 'Compte médecin rejeté',
        html: `
            <h1>Compte rejeté</h1>
            <p>Bonjour ${name},</p>
            <p>Votre demande de compte médecin a été rejetée pour la raison suivante :</p>
            <p><em>${reason}</em></p>
            <p>Pour plus d'informations, veuillez contacter l'administrateur.</p>
            <p>Cordialement,<br>L'équipe Mbote-Doc</p>
        `
    })
}; 