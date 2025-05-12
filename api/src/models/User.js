import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Le numéro de téléphone est requis'],
        unique: true,
        validate: {
            validator: function(phone) {
                try {
                    // Vérifier si le numéro est valide pour n'importe quel pays
                    if (!isValidPhoneNumber(phone)) {
                        return false;
                    }
                    // Formater le numéro en format international
                    const phoneNumber = parsePhoneNumber(phone);
                    this.phone = phoneNumber.format('E.164');
                    return true;
                } catch (error) {
                    return false;
                }
            },
            message: 'Numéro de téléphone invalide. Format attendu: +XXX XXXXXXXXX'
        }
    },
    password: {
        type: String,
        required: [true, 'Le mot de passe est requis'],
        minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
        select: false
    },
    role: {
        type: String,
        enum: ['patient', 'doctor', 'admin'],
        default: 'patient'
    },
    firstName: {
        type: String,
        required: [true, 'Le prénom est requis'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Le nom est requis'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Middleware pour hasher le mot de passe avant la sauvegarde
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir les informations publiques de l'utilisateur
userSchema.methods.toPublicJSON = function() {
    return {
        id: this._id,
        phone: this.phone,
        role: this.role,
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        isVerified: this.isVerified,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt
    };
};

const User = mongoose.model('User', userSchema);

export default User; 