import mongoose from 'mongoose';
import User from './User.js';

const patientSchema = new mongoose.Schema({
    // Les champs de base sont hérités de User (phone, password, role, etc.)
    
    // Informations du profil (optionnelles)
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['M', 'F', 'A']
    },
    address: {
        type: String,
        trim: true
    },
    photo: {
        type: String // URL de la photo
    },
    // Statut du profil
    isProfileComplete: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Créer un index pour la recherche par téléphone
patientSchema.index({ phone: 1 });

// Méthode pour obtenir les informations publiques du patient
patientSchema.methods.toPublicJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

const Patient = User.discriminator('Patient', patientSchema);

export default Patient; 