import http from "http";
import dotenv from "dotenv";
import { connectRedis } from "./src/config/redis.js";
import { initializeSocket } from "./src/sockets/socket.js";
import { connectDB } from "./src/config/db.js";
import app from "./src/app.js";

dotenv.config();
const PORT = process.env.PORT || 5002;
const BACKUP_PORT = 5001;

// Créer serveur HTTP
const server = http.createServer(app);

// Initialiser Socket.IO
initializeSocket(server);

// Fonction pour démarrer le serveur
const startServer = (port) => {
    server.listen(port, () => {
        console.log(`🚀 Serveur en cours sur http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ Port ${port} déjà utilisé, tentative sur le port ${BACKUP_PORT}...`);
            startServer(BACKUP_PORT);
        } else {
            console.error("❌ Erreur serveur:", err);
            process.exit(1);
        }
    });
};

// Initialiser les connexions
const initializeConnections = async () => {
    try {
        // Connecter à MongoDB
        await connectDB();
        console.log("✅ MongoDB connecté !");

        // Connecter à Redis
        await connectRedis();
        console.log("✅ Redis connecté !");

        // Démarrer le serveur
        startServer(PORT);
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        process.exit(1);
    }
};

// Démarrer l'application
initializeConnections();

// Gestion des erreurs non capturées
process.on('unhandledRejection', err => {
    console.error('ERREUR NON GÉRÉE 💥', err);
    process.exit(1);
});

// Gestion des erreurs non gérées
process.on('uncaughtException', err => {
    console.error('ERREUR NON GÉRÉE 💥', err);
    process.exit(1);
});
