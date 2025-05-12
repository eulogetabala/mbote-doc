import Doctor from '../../models/Doctor.js';
import { sendSMS } from '../../utils/sms.js';
import { sendEmail } from '../../utils/email.js';

// Créer un nouveau médecin
export const createDoctor = async (req, res) => {
    try {
        const {
            phone,
            firstName,
            lastName,
            email,
            specialization,
            licenseNumber,
            // ... autres champs du médecin
        } = req.body;

        // Générer un mot de passe temporaire
        const temporaryPassword = Doctor.generateTemporaryPassword();

        // Créer le médecin
        const doctor = new Doctor({
            phone,
            firstName,
            lastName,
            email,
            specialization,
            licenseNumber,
            temporaryPassword,
            password: temporaryPassword, // Le mot de passe temporaire est aussi le mot de passe initial
            role: 'doctor',
            isVerified: false,
            registrationStatus: 'pending'
        });

        await doctor.save();

        // Envoyer les identifiants par SMS
        await sendSMS(phone, `Bienvenue sur MBOTE! Votre compte a été créé. Identifiants temporaires: ${phone} / ${temporaryPassword}. Veuillez changer votre mot de passe à la première connexion.`);

        // Envoyer les identifiants par email si disponible
        if (email) {
            await sendEmail(email, {
                subject: 'Bienvenue sur MBOTE - Vos identifiants',
                text: `Votre compte a été créé. Identifiants temporaires:\nTéléphone: ${phone}\nMot de passe: ${temporaryPassword}\n\nVeuillez changer votre mot de passe à la première connexion.`
            });
        }

        res.status(201).json({
            success: true,
            message: 'Médecin créé avec succès',
            data: doctor.toPublicJSON()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la création du médecin',
            error: error.message
        });
    }
};

// Approuver un médecin
export const approveDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const adminId = req.user._id; // L'admin qui approuve

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médecin non trouvé'
            });
        }

        doctor.registrationStatus = 'approved';
        doctor.approvedBy = adminId;
        doctor.approvalDate = new Date();
        doctor.isVerified = true;

        await doctor.save();

        // Notifier le médecin
        await sendSMS(doctor.phone, 'Votre compte a été approuvé. Vous pouvez maintenant vous connecter à MBOTE.');
        if (doctor.email) {
            await sendEmail(doctor.email, {
                subject: 'Compte MBOTE approuvé',
                text: 'Votre compte a été approuvé. Vous pouvez maintenant vous connecter à MBOTE.'
            });
        }

        res.json({
            success: true,
            message: 'Médecin approuvé avec succès',
            data: doctor.toPublicJSON()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Erreur lors de l\'approbation du médecin',
            error: error.message
        });
    }
};

// Rejeter un médecin
export const rejectDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { reason } = req.body;

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médecin non trouvé'
            });
        }

        doctor.registrationStatus = 'rejected';
        doctor.rejectionReason = reason;

        await doctor.save();

        // Notifier le médecin
        await sendSMS(doctor.phone, `Votre inscription a été rejetée. Raison: ${reason}`);
        if (doctor.email) {
            await sendEmail(doctor.email, {
                subject: 'Inscription MBOTE rejetée',
                text: `Votre inscription a été rejetée.\nRaison: ${reason}`
            });
        }

        res.json({
            success: true,
            message: 'Médecin rejeté avec succès'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Erreur lors du rejet du médecin',
            error: error.message
        });
    }
};

// Lister tous les médecins
export const listDoctors = async (req, res) => {
    try {
        const { status, specialization } = req.query;
        const query = {};

        if (status) {
            query.registrationStatus = status;
        }
        if (specialization) {
            query.specialization = specialization;
        }

        const doctors = await Doctor.find(query)
            .select('-temporaryPassword -password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: doctors
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la récupération des médecins',
            error: error.message
        });
    }
}; 