import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { validate, authValidation } from '../middlewares/validator.js';
import {
    login,
    changePassword,
    resetPassword,
    verifyToken
} from '../controllers/authController.js';

const router = express.Router();

// Routes publiques
router.post('/login', authValidation.login, validate, login);

// Routes protégées
router.use(authenticate);
router.post('/change-password', authValidation.changePassword, validate, changePassword);
router.post('/reset-password', authorize('admin'), authValidation.resetPassword, validate, resetPassword);
router.get('/verify', verifyToken);

export default router; 