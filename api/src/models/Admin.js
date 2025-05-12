import mongoose from 'mongoose';
import User from './User.js';

const adminSchema = new mongoose.Schema({
    permissions: [{
        type: String,
        enum: [
            'manage_users',
            'manage_doctors',
            'manage_appointments',
            'manage_payments',
            'view_statistics',
            'manage_specialties',
            'manage_settings'
        ]
    }],
    lastActivity: {
        type: Date,
        default: Date.now
    },
    activityLog: [{
        action: String,
        details: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Méthode pour vérifier les permissions
adminSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission);
};

// Méthode pour ajouter une activité
adminSchema.methods.logActivity = function(action, details) {
    this.activityLog.push({ action, details });
    this.lastActivity = new Date();
};

// Méthode pour obtenir les informations publiques de l'admin
adminSchema.methods.toPublicJSON = function() {
    const obj = this.toObject();
    delete obj.activityLog;
    delete obj.__v;
    return obj;
};

const Admin = User.discriminator('Admin', adminSchema);

export default Admin; 