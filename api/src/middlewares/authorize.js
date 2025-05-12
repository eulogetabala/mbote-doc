import { AppError } from '../utils/AppError.js';

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Non authentifié', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError(`Rôle ${req.user.role} non autorisé à accéder à cette ressource`, 403));
        }

        next();
    };
}; 