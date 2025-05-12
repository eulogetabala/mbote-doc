import { body, validationResult } from 'express-validator';

// Middleware pour gérer les erreurs de validation
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Validations pour l'authentification
export const authValidation = {
    login: [
        body('phone')
            .notEmpty().withMessage('Le numéro de téléphone est requis')
            .matches(/^\+?[0-9]{10,15}$/).withMessage('Format de numéro de téléphone invalide'),
        body('password')
            .notEmpty().withMessage('Le mot de passe est requis')
            .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
    ],
    changePassword: [
        body('currentPassword')
            .notEmpty().withMessage('Le mot de passe actuel est requis')
            .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
        body('newPassword')
            .notEmpty().withMessage('Le nouveau mot de passe est requis')
            .isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
            .custom((value, { req }) => {
                if (value === req.body.currentPassword) {
                    throw new Error('Le nouveau mot de passe doit être différent de l\'ancien');
                }
                return true;
            })
    ],
    resetPassword: [
        body('userId')
            .notEmpty().withMessage('L\'ID de l\'utilisateur est requis')
            .isMongoId().withMessage('ID utilisateur invalide'),
        body('newPassword')
            .notEmpty().withMessage('Le nouveau mot de passe est requis')
            .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
    ]
};

// Validations pour les médecins
export const doctorValidation = {
    create: [
        body('phone')
            .notEmpty().withMessage('Le numéro de téléphone est requis')
            .matches(/^\+?[0-9]{10,15}$/).withMessage('Format de numéro de téléphone invalide'),
        body('firstName')
            .notEmpty().withMessage('Le prénom est requis')
            .trim(),
        body('lastName')
            .notEmpty().withMessage('Le nom est requis')
            .trim(),
        body('specialization')
            .notEmpty().withMessage('La spécialisation est requise'),
        body('licenseNumber')
            .notEmpty().withMessage('Le numéro de licence est requis'),
        body('consultationFee')
            .notEmpty().withMessage('Les frais de consultation sont requis')
            .isNumeric().withMessage('Les frais de consultation doivent être un nombre'),
        body('email')
            .optional()
            .isEmail().withMessage('Format d\'email invalide')
    ],
    update: [
        body('phone')
            .optional()
            .matches(/^\+?[0-9]{10,15}$/).withMessage('Format de numéro de téléphone invalide'),
        body('email')
            .optional()
            .isEmail().withMessage('Format d\'email invalide'),
        body('consultationFee')
            .optional()
            .isNumeric().withMessage('Les frais de consultation doivent être un nombre')
    ],
    updateLocation: [
        body('latitude')
            .notEmpty().withMessage('La latitude est requise')
            .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
        body('longitude')
            .notEmpty().withMessage('La longitude est requise')
            .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide')
    ],
    reject: [
        body('reason')
            .notEmpty().withMessage('La raison du rejet est requise')
            .isLength({ min: 10 }).withMessage('La raison doit contenir au moins 10 caractères')
    ]
};

// Validations pour les patients
export const patientValidation = {
    create: [
        body('phone')
            .notEmpty().withMessage('Le numéro de téléphone est requis')
            .matches(/^\+?[0-9]{10,15}$/).withMessage('Format de numéro de téléphone invalide'),
        body('firstName')
            .notEmpty().withMessage('Le prénom est requis')
            .trim(),
        body('lastName')
            .notEmpty().withMessage('Le nom est requis')
            .trim(),
        body('dateOfBirth')
            .notEmpty().withMessage('La date de naissance est requise')
            .isDate().withMessage('Format de date invalide'),
        body('gender')
            .notEmpty().withMessage('Le genre est requis')
            .isIn(['male', 'female', 'other']).withMessage('Genre invalide'),
        body('address')
            .optional()
            .isObject().withMessage('L\'adresse doit être un objet'),
        body('address.street')
            .optional()
            .isString().withMessage('La rue doit être une chaîne de caractères'),
        body('address.city')
            .optional()
            .isString().withMessage('La ville doit être une chaîne de caractères'),
        body('address.state')
            .optional()
            .isString().withMessage('L\'état doit être une chaîne de caractères'),
        body('address.country')
            .optional()
            .isString().withMessage('Le pays doit être une chaîne de caractères'),
        body('address.postalCode')
            .optional()
            .isString().withMessage('Le code postal doit être une chaîne de caractères')
    ],
    update: [
        body('phone')
            .optional()
            .matches(/^\+?[0-9]{10,15}$/).withMessage('Format de numéro de téléphone invalide'),
        body('dateOfBirth')
            .optional()
            .isDate().withMessage('Format de date invalide'),
        body('gender')
            .optional()
            .isIn(['male', 'female', 'other']).withMessage('Genre invalide'),
        body('address')
            .optional()
            .isObject().withMessage('L\'adresse doit être un objet')
    ],
    findNearbyDoctors: [
        body('latitude')
            .notEmpty().withMessage('La latitude est requise')
            .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
        body('longitude')
            .notEmpty().withMessage('La longitude est requise')
            .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
        body('maxDistance')
            .optional()
            .isFloat({ min: 0 }).withMessage('La distance maximale doit être un nombre positif'),
        body('specialization')
            .optional()
            .trim()
    ],
    register: [
        body('phone')
            .notEmpty().withMessage('Le numéro de téléphone est requis')
            .matches(/^\+?[0-9]{10,15}$/).withMessage('Format de numéro de téléphone invalide'),
        body('password')
            .notEmpty().withMessage('Le mot de passe est requis')
            .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
    ],
    verifyOTP: [
        body('phone')
            .notEmpty().withMessage('Le numéro de téléphone est requis')
            .matches(/^\+?[0-9]{10,15}$/).withMessage('Format de numéro de téléphone invalide'),
        body('otp')
            .notEmpty().withMessage('Le code OTP est requis')
            .matches(/^[0-9]{6}$/).withMessage('Le code OTP doit contenir 6 chiffres')
    ],
    completeProfile: [
        body('firstName')
            .optional()
            .trim()
            .isLength({ min: 2 }).withMessage('Le prénom doit contenir au moins 2 caractères'),
        body('lastName')
            .optional()
            .trim()
            .isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères'),
        body('dateOfBirth')
            .optional()
            .isISO8601().withMessage('La date de naissance doit être au format YYYY-MM-DD'),
        body('gender')
            .optional()
            .isIn(['M', 'F', 'A']).withMessage('Le genre doit être M, F ou A'),
        body('address')
            .optional()
            .trim()
            .isLength({ min: 5 }).withMessage('L\'adresse doit contenir au moins 5 caractères'),
        body('photo')
            .optional()
            .isURL().withMessage('L\'URL de la photo n\'est pas valide')
    ]
};

// Validations pour le calendrier du médecin
export const doctorScheduleValidation = {
    create: [
        body('workingHours')
            .notEmpty().withMessage('Les heures de travail sont requises')
            .isObject().withMessage('Les heures de travail doivent être un objet'),
        body('workingHours.*.start')
            .notEmpty().withMessage('L\'heure de début est requise')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format d\'heure invalide (HH:MM)'),
        body('workingHours.*.end')
            .notEmpty().withMessage('L\'heure de fin est requise')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format d\'heure invalide (HH:MM)')
    ],
    break: [
        body('startTime')
            .notEmpty().withMessage('L\'heure de début est requise')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format d\'heure invalide (HH:MM)'),
        body('endTime')
            .notEmpty().withMessage('L\'heure de fin est requise')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format d\'heure invalide (HH:MM)'),
        body('reason')
            .optional()
            .trim()
    ],
    holiday: [
        body('date')
            .notEmpty().withMessage('La date est requise')
            .isDate().withMessage('Format de date invalide'),
        body('reason')
            .notEmpty().withMessage('La raison est requise')
            .trim()
    ],
    vacationRequest: [
        body('startDate')
            .notEmpty().withMessage('La date de début est requise')
            .isDate().withMessage('Format de date invalide'),
        body('endDate')
            .notEmpty().withMessage('La date de fin est requise')
            .isDate().withMessage('Format de date invalide')
            .custom((value, { req }) => {
                if (new Date(value) <= new Date(req.body.startDate)) {
                    throw new Error('La date de fin doit être postérieure à la date de début');
                }
                return true;
            }),
        body('reason')
            .notEmpty().withMessage('La raison est requise')
            .trim()
    ]
}; 