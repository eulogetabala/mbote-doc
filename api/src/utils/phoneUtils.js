import { parsePhoneNumber, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js';

// Liste des pays qui utilisent le 0 au début du numéro
const COUNTRIES_WITH_LEADING_ZERO = [
    'FR', // France
    'CD', // Congo RDC
    'CG', // Congo Brazzaville
    'CM', // Cameroun
    'GA', // Gabon
    'CF', // RCA
    'TD', // Tchad
    'GQ', // Guinée équatoriale
    'SN', // Sénégal
    'CI', // Côte d'Ivoire
    'BF', // Burkina Faso
    'ML', // Mali
    'NE', // Niger
    'BJ', // Bénin
    'TG', // Togo
    'GN', // Guinée
    'DZ', // Algérie
    'MA', // Maroc
    'TN', // Tunisie
    'BE', // Belgique
    'CH', // Suisse
    'IT', // Italie
    'ES', // Espagne
    'PT', // Portugal
    'DE', // Allemagne
    'AT', // Autriche
    'NL', // Pays-Bas
    'GB', // Royaume-Uni
    'IE'  // Irlande
];

// Obtenir la liste de tous les pays supportés
const SUPPORTED_COUNTRIES = getCountries().reduce((acc, countryCode) => {
    acc[countryCode] = {
        name: new Intl.DisplayNames(['fr'], { type: 'region' }).of(countryCode),
        code: getCountryCallingCode(countryCode),
        hasLeadingZero: COUNTRIES_WITH_LEADING_ZERO.includes(countryCode)
    };
    return acc;
}, {});

/**
 * Ajoute l'indicatif du pays au numéro si nécessaire
 * @param {string} phone - Le numéro de téléphone
 * @param {string} countryCode - Le code pays
 * @returns {string} - Le numéro avec l'indicatif
 */
const addCountryCode = (phone, countryCode) => {
    const countryCallingCode = getCountryCallingCode(countryCode);
    const hasLeadingZero = COUNTRIES_WITH_LEADING_ZERO.includes(countryCode);
    
    // Si le numéro ne commence pas par + ou l'indicatif du pays
    if (!phone.startsWith('+') && !phone.startsWith(countryCallingCode)) {
        // Si le pays utilise le 0 et que le numéro n'en a pas, on l'ajoute
        if (hasLeadingZero && !phone.startsWith('0')) {
            return `+${countryCallingCode}0${phone}`;
        }
        // Si le pays n'utilise pas le 0, on enlève le 0 s'il existe
        if (!hasLeadingZero && phone.startsWith('0')) {
            return `+${countryCallingCode}${phone.substring(1)}`;
        }
        return `+${countryCallingCode}${phone}`;
    }
    return phone;
};

/**
 * Formate un numéro de téléphone selon le pays
 * @param {string} phone - Le numéro de téléphone à formater
 * @param {string} countryCode - Le code pays (ex: 'CD' pour Congo)
 * @returns {Object} - { isValid: boolean, formattedNumber: string, country: string, countryCode: string }
 */
export const formatPhoneNumber = (phone, countryCode = 'CD') => {
    try {
        // Ajouter l'indicatif du pays si nécessaire
        const phoneWithCountryCode = addCountryCode(phone, countryCode);
        
        // Vérifier si le numéro est valide
        if (!isValidPhoneNumber(phoneWithCountryCode, countryCode)) {
            const hasLeadingZero = COUNTRIES_WITH_LEADING_ZERO.includes(countryCode);
            const formatExample = hasLeadingZero ? 
                `+${getCountryCallingCode(countryCode)} 0XXXXXXXXX` : 
                `+${getCountryCallingCode(countryCode)} XXXXXXXXX`;
            
            return {
                isValid: false,
                error: `Numéro de téléphone invalide pour ${SUPPORTED_COUNTRIES[countryCode]?.name || countryCode}. Format attendu: ${formatExample}`
            };
        }

        // Formater le numéro
        const phoneNumber = parsePhoneNumber(phoneWithCountryCode, countryCode);
        return {
            isValid: true,
            formattedNumber: phoneNumber.format('E.164'),
            country: SUPPORTED_COUNTRIES[countryCode]?.name || countryCode,
            countryCode: countryCode,
            nationalNumber: phoneNumber.nationalNumber,
            internationalNumber: phoneNumber.format('INTERNATIONAL'),
            countryCallingCode: phoneNumber.countryCallingCode,
            hasLeadingZero: COUNTRIES_WITH_LEADING_ZERO.includes(countryCode)
        };
    } catch (error) {
        return {
            isValid: false,
            error: 'Format de numéro de téléphone invalide'
        };
    }
};

/**
 * Vérifie si un numéro de téléphone est valide pour un pays donné
 * @param {string} phone - Le numéro de téléphone à vérifier
 * @param {string} countryCode - Le code pays
 * @returns {boolean}
 */
export const isValidPhone = (phone, countryCode = 'CD') => {
    const phoneWithCountryCode = addCountryCode(phone, countryCode);
    return isValidPhoneNumber(phoneWithCountryCode, countryCode);
};

/**
 * Obtient la liste de tous les pays supportés
 * @returns {Object} - Liste des pays avec leurs codes et noms
 */
export const getSupportedCountries = () => {
    return SUPPORTED_COUNTRIES;
};

/**
 * Obtient les informations d'un pays spécifique
 * @param {string} countryCode - Le code pays
 * @returns {Object|null} - Informations du pays ou null si non trouvé
 */
export const getCountryInfo = (countryCode) => {
    return SUPPORTED_COUNTRIES[countryCode] || null;
};

export default {
    formatPhoneNumber,
    isValidPhone,
    getSupportedCountries,
    getCountryInfo,
    SUPPORTED_COUNTRIES
}; 