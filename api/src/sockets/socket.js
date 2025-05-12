import { Server } from 'socket.io';
import redisClient from '../config/redis.js';

export const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Middleware d'authentification Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }
            // TODO: Vérifier le token JWT
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log('Nouvelle connexion socket:', socket.id);

        // Gestion des messages privés
        socket.on('private_message', async (data) => {
            try {
                const { recipientId, message } = data;
                // Stocker le message dans Redis
                await redisClient.lPush(`chat:${socket.id}:${recipientId}`, JSON.stringify({
                    sender: socket.id,
                    message,
                    timestamp: new Date()
                }));
                
                // Envoyer le message au destinataire
                io.to(recipientId).emit('private_message', {
                    sender: socket.id,
                    message,
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('Erreur lors de l\'envoi du message:', error);
            }
        });

        // Gestion des rendez-vous en temps réel
        socket.on('appointment_update', (data) => {
            io.emit('appointment_update', data);
        });

        // Gestion de la déconnexion
        socket.on('disconnect', () => {
            console.log('Déconnexion socket:', socket.id);
        });
    });

    return io;
}; 