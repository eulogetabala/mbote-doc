import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('Erreur Redis:', err);
});

redisClient.on('connect', () => {
    console.log('Connecté à Redis');
});

// Fonction pour connecter au client Redis
export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Erreur de connexion Redis:', error);
        process.exit(1);
    }
};

export default redisClient; 