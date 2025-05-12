import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
    try {
        // Vérifier le token dans les headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError('Token d\'authentification manquant', 401));
        }

        const token = authHeader.split(' ')[1];

        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Vérifier si l'utilisateur existe toujours
        const user = await User.findById(decoded.id);
        if (!user) {
            return next(new AppError('Utilisateur non trouvé', 401));
        }

        // Vérifier si le compte est actif
        if (!user.isActive) {
            return next(new AppError('Compte désactivé', 401));
        }

        // Ajouter l'utilisateur à la requête
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new AppError('Token invalide', 401));
        } else if (error.name === 'TokenExpiredError') {
            next(new AppError('Token expiré', 401));
        } else {
            next(error);
        }
    }
};

// Middleware pour vérifier les rôles
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Rôle ${req.user.role} non autorisé à accéder à cette ressource`
            });
        }
        next();
    };
}; 