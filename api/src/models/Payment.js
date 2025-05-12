import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: [true, 'Le rendez-vous est requis']
    },
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
    amount: {
        type: Number,
        required: [true, 'Le montant est requis'],
        min: [0, 'Le montant ne peut pas être négatif']
    },
    currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'CDF']
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['mobile_money', 'credit_card', 'bank_transfer', 'cash'],
        required: [true, 'La méthode de paiement est requise']
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    refundDate: Date,
    refundReason: String,
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index pour la recherche rapide
paymentSchema.index({ appointment: 1 });
paymentSchema.index({ patient: 1 });
paymentSchema.index({ doctor: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });

// Méthode pour obtenir les informations publiques du paiement
paymentSchema.methods.getPublicInfo = function() {
    return {
        id: this._id,
        amount: this.amount,
        currency: this.currency,
        status: this.status,
        paymentMethod: this.paymentMethod,
        paymentDate: this.paymentDate,
        appointment: this.appointment
    };
};

// Méthode pour vérifier si le paiement peut être remboursé
paymentSchema.methods.canBeRefunded = function() {
    return this.status === 'completed' && 
           !this.refundDate && 
           new Date(this.paymentDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment; 