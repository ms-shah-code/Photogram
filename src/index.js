import express from 'express';
import { app } from './app.js';
import dotenv from "dotenv";
import connectionDB from './db/index.js';

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 5000;

connectionDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    }).catch((err) => {
        console.log("MONGO db connection failed !!! ", err);
    });

