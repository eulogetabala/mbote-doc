import DoctorSchedule from '../models/DoctorSchedule.js';
import Doctor from '../models/Doctor.js';
import { sendNotification } from '../services/notificationService.js';
import { NOTIFICATION_TYPES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Créer ou mettre à jour le calendrier d'un médecin
export const createOrUpdateSchedule = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const { workingHours, breaks, holidays, vacations } = req.body;

    // Vérifier si le médecin existe
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
        throw new ApiError(404, 'Médecin non trouvé');
    }

    // Vérifier si un calendrier existe déjà
    let schedule = await DoctorSchedule.findOne({ doctor: doctorId });

    if (schedule) {
        // Mise à jour
        schedule.workingHours = workingHours;
        schedule.breaks = breaks;
        schedule.holidays = holidays;
        schedule.vacations = vacations;
        await schedule.save();
    } else {
        // Création
        schedule = await DoctorSchedule.create({
            doctor: doctorId,
            workingHours,
            breaks,
            holidays,
            vacations
        });
    }

    res.status(200).json({
        success: true,
        data: schedule
    });
});

// Obtenir le calendrier d'un médecin
export const getSchedule = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;

    const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
    if (!schedule) {
        throw new ApiError(404, 'Calendrier non trouvé');
    }

    res.status(200).json({
        success: true,
        data: schedule
    });
});

// Obtenir les disponibilités d'un médecin pour une date
export const getAvailability = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
        throw new ApiError(400, 'La date est requise');
    }

    const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
    if (!schedule) {
        throw new ApiError(404, 'Calendrier non trouvé');
    }

    const availability = schedule.getDayAvailability(new Date(date));

    res.status(200).json({
        success: true,
        data: availability
    });
});

// Ajouter une pause
export const addBreak = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const breakData = req.body;

    const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
    if (!schedule) {
        throw new ApiError(404, 'Calendrier non trouvé');
    }

    schedule.breaks.push(breakData);
    await schedule.save();

    res.status(200).json({
        success: true,
        data: schedule
    });
});

// Ajouter un jour férié
export const addHoliday = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const holidayData = req.body;

    const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
    if (!schedule) {
        throw new ApiError(404, 'Calendrier non trouvé');
    }

    schedule.holidays.push(holidayData);
    await schedule.save();

    res.status(200).json({
        success: true,
        data: schedule
    });
});

// Demander un congé
export const requestVacation = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const vacationData = req.body;

    const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
    if (!schedule) {
        throw new ApiError(404, 'Calendrier non trouvé');
    }

    // Vérifier les chevauchements avec les rendez-vous existants
    const hasOverlappingAppointments = await checkOverlappingAppointments(doctorId, vacationData);
    if (hasOverlappingAppointments) {
        throw new ApiError(400, 'Des rendez-vous existent pendant cette période');
    }

    schedule.vacations.push({
        ...vacationData,
        status: 'pending'
    });
    await schedule.save();

    // Notifier l'admin
    await sendNotification({
        type: NOTIFICATION_TYPES.VACATION_REQUEST,
        recipient: {
            phone: process.env.ADMIN_PHONE,
            email: process.env.ADMIN_EMAIL,
            country: 'CD'
        },
        data: {
            doctorName: `${req.user.firstName} ${req.user.lastName}`,
            startDate: vacationData.startDate,
            endDate: vacationData.endDate,
            reason: vacationData.reason
        }
    });

    res.status(200).json({
        success: true,
        data: schedule
    });
});

// Approuver/rejeter un congé (admin uniquement)
export const handleVacationRequest = asyncHandler(async (req, res) => {
    const { doctorId, vacationId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        throw new ApiError(400, 'Statut invalide');
    }

    const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
    if (!schedule) {
        throw new ApiError(404, 'Calendrier non trouvé');
    }

    const vacation = schedule.vacations.id(vacationId);
    if (!vacation) {
        throw new ApiError(404, 'Demande de congé non trouvée');
    }

    vacation.status = status;
    vacation.approvedBy = req.user._id;
    vacation.approvalDate = new Date();
    await schedule.save();

    // Notifier le médecin
    const doctor = await Doctor.findById(doctorId);
    await sendNotification({
        type: NOTIFICATION_TYPES.VACATION_RESPONSE,
        recipient: {
            phone: doctor.phone,
            email: doctor.email,
            country: doctor.country
        },
        data: {
            status,
            startDate: vacation.startDate,
            endDate: vacation.endDate,
            reason: vacation.reason
        }
    });

    res.status(200).json({
        success: true,
        data: schedule
    });
});

// Fonction utilitaire pour vérifier les chevauchements de rendez-vous
async function checkOverlappingAppointments(doctorId, vacationData) {
    const Appointment = mongoose.model('Appointment');
    const overlappingAppointments = await Appointment.find({
        doctor: doctorId,
        date: {
            $gte: vacationData.startDate,
            $lte: vacationData.endDate
        },
        status: { $in: ['pending', 'confirmed'] }
    });

    return overlappingAppointments.length > 0;
} 