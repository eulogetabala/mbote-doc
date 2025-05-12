import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: [true, 'Le patient est requis']
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: [true, 'Le médecin est requis']
    },
    date: {
        type: Date,
        required: [true, 'La date du rendez-vous est requise']
    },
    startTime: {
        type: String,
        required: [true, 'L\'heure de début est requise']
    },
    endTime: {
        type: String,
        required: [true, 'L\'heure de fin est requise']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['consultation', 'follow-up', 'emergency'],
        default: 'consultation'
    },
    reason: {
        type: String,
        required: [true, 'Le motif du rendez-vous est requis']
    },
    notes: {
        type: String
    },
    cancellationReason: {
        type: String
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancellationDate: {
        type: Date
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
    },
    paymentAmount: {
        type: Number
    },
    paymentDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Index pour la recherche rapide
appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ status: 1 });

// Méthode pour vérifier si le rendez-vous est dans le futur
appointmentSchema.methods.isFuture = function() {
    const appointmentDateTime = new Date(`${this.date.toISOString().split('T')[0]}T${this.startTime}`);
    return appointmentDateTime > new Date();
};

// Méthode pour vérifier si le rendez-vous peut être annulé
appointmentSchema.methods.canBeCancelled = function() {
    if (this.status === 'cancelled' || this.status === 'completed') {
        return false;
    }
    const appointmentDateTime = new Date(`${this.date.toISOString().split('T')[0]}T${this.startTime}`);
    const hoursUntilAppointment = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
    return hoursUntilAppointment >= 24; // Peut être annulé jusqu'à 24h avant
};

// Méthode pour obtenir les informations publiques du rendez-vous
appointmentSchema.methods.toPublicJSON = function() {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment; 