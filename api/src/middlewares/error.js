import { AppError } from '../utils/AppError.js';

// Middleware pour gérer les erreurs de développement
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

// Middleware pour gérer les erreurs en production
const sendErrorProd = (err, res) => {
    // Erreur opérationnelle : envoyer le message au client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    } 
    // Erreur de programmation : ne pas envoyer les détails au client
    else {
        console.error('ERREUR 💥', err);
        res.status(500).json({
            success: false,
            message: 'Une erreur est survenue'
        });
    }
};

// Middleware pour gérer les erreurs MongoDB
const handleCastErrorDB = err => {
    const message = `Données invalides: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Valeur en double: ${value}. Veuillez utiliser une autre valeur.`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Données invalides. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

// Middleware pour gérer les erreurs JWT
const handleJWTError = () => 
    new AppError('Token invalide. Veuillez vous reconnecter.', 401);

const handleJWTExpiredError = () => 
    new AppError('Votre session a expiré. Veuillez vous reconnecter.', 401);

// Middleware principal de gestion des erreurs
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};

// Gestionnaire pour les routes non trouvées
export const notFound = (req, res, next) => {
    const error = new Error(`Route non trouvée - ${req.originalUrl}`);
    res.status(404);
    next(error);
}; 