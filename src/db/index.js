import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectionDB = async () => {
    try {
        const connectionDB = await mongoose.connect(`mongodb://localhost:27017/${DB_NAME}`)
        console.log(`MongoDB connected || HOST NAME: ${connectionDB.connection.host}`)
    } catch (error) {
        console.log("MondoDB connection failed!")
        process.exit(1)
    }
}

export default connectionDB