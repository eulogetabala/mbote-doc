import mongoose from 'mongoose';
import User from './User.js';

const doctorSchema = new mongoose.Schema({
    specialization: {
        type: String,
        required: [true, 'La spécialisation est requise']
    },
    licenseNumber: {
        type: String,
        required: [true, 'Le numéro de licence est requis'],
        unique: true
    },
    education: [{
        degree: String,
        institution: String,
        year: Number,
        specialization: String
    }],
    experience: [{
        position: String,
        hospital: String,
        startDate: Date,
        endDate: Date,
        description: String
    }],
    languages: [{
        type: String
    }],
    consultationFee: {
        type: Number,
        required: [true, 'Les frais de consultation sont requis']
    },
    availability: {
        monday: [{ start: String, end: String }],
        tuesday: [{ start: String, end: String }],
        wednesday: [{ start: String, end: String }],
        thursday: [{ start: String, end: String }],
        friday: [{ start: String, end: String }],
        saturday: [{ start: String, end: String }],
        sunday: [{ start: String, end: String }]
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        },
        address: {
            street: String,
            city: String,
            state: String,
            country: String,
            postalCode: String
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationDocuments: [{
        type: String, // URLs des documents
        required: [true, 'Les documents de vérification sont requis']
    }],
    rating: {
        average: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        }
    },
    appointments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    }],
    patients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
    }],
    // Nouveaux champs pour la gestion par l'admin
    registrationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    approvalDate: Date,
    rejectionReason: String,
    temporaryPassword: {
        type: String,
        required: true
    },
    passwordChanged: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

// Index pour la recherche géospatiale
doctorSchema.index({ location: '2dsphere' });

// Index pour la recherche par spécialisation
doctorSchema.index({ specialization: 1 });

// Méthode pour calculer la note moyenne
doctorSchema.methods.updateRating = function(newRating) {
    this.rating.average = ((this.rating.average * this.rating.count) + newRating) / (this.rating.count + 1);
    this.rating.count += 1;
};

// Méthode pour obtenir les informations publiques du médecin
doctorSchema.methods.toPublicJSON = function() {
    const obj = this.toObject();
    delete obj.verificationDocuments;
    delete obj.__v;
    return obj;
};

// Méthode pour générer un mot de passe temporaire
doctorSchema.statics.generateTemporaryPassword = function() {
    return Math.random().toString(36).slice(-8);
};

// Méthode pour vérifier si le médecin doit changer son mot de passe
doctorSchema.methods.shouldChangePassword = function() {
    return !this.passwordChanged;
};

// Méthode pour marquer le mot de passe comme changé
doctorSchema.methods.markPasswordChanged = function() {
    this.passwordChanged = true;
    this.temporaryPassword = undefined;
};

const Doctor = User.discriminator('Doctor', doctorSchema);

export default Doctor; 