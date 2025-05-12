import Doctor from '../models/Doctor.js';

// Calculer la distance entre deux points (formule de Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Trouver les médecins à proximité
export const findNearbyDoctors = async (latitude, longitude, maxDistance = 10, specialization = null) => {
    try {
        // Construire la requête de base
        let query = {
            isActive: true,
            'location.coordinates': {
                $exists: true,
                $ne: null
            }
        };

        // Ajouter le filtre de spécialisation si spécifié
        if (specialization) {
            query.specialization = specialization;
        }

        // Récupérer tous les médecins actifs avec leurs coordonnées
        const doctors = await Doctor.find(query);

        // Filtrer les médecins par distance
        const nearbyDoctors = doctors.filter(doctor => {
            const distance = calculateDistance(
                latitude,
                longitude,
                doctor.location.coordinates.latitude,
                doctor.location.coordinates.longitude
            );
            return distance <= maxDistance;
        });

        // Trier par distance
        return nearbyDoctors.sort((a, b) => {
            const distanceA = calculateDistance(
                latitude,
                longitude,
                a.location.coordinates.latitude,
                a.location.coordinates.longitude
            );
            const distanceB = calculateDistance(
                latitude,
                longitude,
                b.location.coordinates.latitude,
                b.location.coordinates.longitude
            );
            return distanceA - distanceB;
        });
    } catch (error) {
        console.error('Erreur lors de la recherche des médecins à proximité:', error);
        throw new Error('Échec de la recherche des médecins à proximité');
    }
};

// Mettre à jour la localisation d'un médecin
export const updateDoctorLocation = async (doctorId, latitude, longitude) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Médecin non trouvé');
        }

        doctor.location = {
            type: 'Point',
            coordinates: {
                latitude,
                longitude
            },
            lastUpdated: new Date()
        };

        await doctor.save();
        return doctor;
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la localisation:', error);
        throw new Error('Échec de la mise à jour de la localisation');
    }
};

// Obtenir la localisation d'un médecin
export const getDoctorLocation = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new Error('Médecin non trouvé');
        }

        if (!doctor.location || !doctor.location.coordinates) {
            throw new Error('Localisation non disponible');
        }

        return {
            latitude: doctor.location.coordinates.latitude,
            longitude: doctor.location.coordinates.longitude,
            lastUpdated: doctor.location.lastUpdated
        };
    } catch (error) {
        console.error('Erreur lors de la récupération de la localisation:', error);
        throw new Error('Échec de la récupération de la localisation');
    }
}; 