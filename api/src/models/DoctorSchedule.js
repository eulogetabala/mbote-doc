import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
    start: {
        type: String,
        required: [true, 'L\'heure de début est requise'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM)']
    },
    end: {
        type: String,
        required: [true, 'L\'heure de fin est requise'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM)']
    }
});

const breakSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: [true, 'Le jour est requis']
    },
    start: {
        type: String,
        required: [true, 'L\'heure de début est requise'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM)']
    },
    end: {
        type: String,
        required: [true, 'L\'heure de fin est requise'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM)']
    },
    type: {
        type: String,
        enum: ['lunch', 'break', 'other'],
        default: 'break'
    },
    reason: String
});

const holidaySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: [true, 'La date est requise']
    },
    reason: {
        type: String,
        required: [true, 'La raison est requise']
    },
    isRecurring: {
        type: Boolean,
        default: false
    }
});

const vacationSchema = new mongoose.Schema({
    startDate: {
        type: Date,
        required: [true, 'La date de début est requise']
    },
    endDate: {
        type: Date,
        required: [true, 'La date de fin est requise']
    },
    reason: {
        type: String,
        required: [true, 'La raison est requise']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: Date
});

const doctorScheduleSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: [true, 'Le médecin est requis']
    },
    workingHours: {
        monday: timeSlotSchema,
        tuesday: timeSlotSchema,
        wednesday: timeSlotSchema,
        thursday: timeSlotSchema,
        friday: timeSlotSchema,
        saturday: timeSlotSchema,
        sunday: timeSlotSchema
    },
    breaks: [breakSchema],
    holidays: [holidaySchema],
    vacations: [vacationSchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index pour la recherche rapide
doctorScheduleSchema.index({ doctor: 1 });
doctorScheduleSchema.index({ 'holidays.date': 1 });
doctorScheduleSchema.index({ 'vacations.startDate': 1, 'vacations.endDate': 1 });

// Méthode pour vérifier si un créneau est disponible
doctorScheduleSchema.methods.isTimeSlotAvailable = function(date, startTime, endTime) {
    // Vérifier si c'est un jour férié
    const isHoliday = this.holidays.some(holiday => 
        holiday.date.toISOString().split('T')[0] === date.toISOString().split('T')[0]
    );
    if (isHoliday) return false;

    // Vérifier si c'est pendant les vacances
    const isVacation = this.vacations.some(vacation => 
        date >= vacation.startDate && 
        date <= vacation.endDate && 
        vacation.status === 'approved'
    );
    if (isVacation) return false;

    // Obtenir le jour de la semaine
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    // Vérifier les horaires de travail
    const workingHours = this.workingHours[dayOfWeek];
    if (!workingHours) return false;

    // Vérifier si le créneau est dans les horaires de travail
    if (startTime < workingHours.start || endTime > workingHours.end) {
        return false;
    }

    // Vérifier les pauses
    const isDuringBreak = this.breaks.some(break_ => 
        break_.day === dayOfWeek && 
        ((startTime >= break_.start && startTime < break_.end) ||
         (endTime > break_.start && endTime <= break_.end))
    );
    if (isDuringBreak) return false;

    return true;
};

// Méthode pour obtenir les disponibilités d'une journée
doctorScheduleSchema.methods.getDayAvailability = function(date) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const workingHours = this.workingHours[dayOfWeek];
    
    if (!workingHours) return [];

    // Vérifier les jours fériés et vacances
    if (!this.isTimeSlotAvailable(date, workingHours.start, workingHours.end)) {
        return [];
    }

    // Générer les créneaux disponibles
    const slots = [];
    let currentTime = workingHours.start;
    
    while (currentTime < workingHours.end) {
        // Vérifier si le créneau chevauche une pause
        const isDuringBreak = this.breaks.some(break_ => 
            break_.day === dayOfWeek && 
            currentTime >= break_.start && 
            currentTime < break_.end
        );

        if (!isDuringBreak) {
            slots.push({
                start: currentTime,
                end: this.addMinutes(currentTime, 30) // Créneaux de 30 minutes
            });
        }

        currentTime = this.addMinutes(currentTime, 30);
    }

    return slots;
};

// Méthode utilitaire pour ajouter des minutes à une heure
doctorScheduleSchema.methods.addMinutes = function(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const DoctorSchedule = mongoose.model('DoctorSchedule', doctorScheduleSchema);

export default DoctorSchedule; 