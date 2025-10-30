import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"
import dotenv from 'dotenv'
import { asyncHandler } from './asyncHandler.js'
import { ApiError } from './ApiError.js'

dotenv.config({
    path: './.env'
})

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (LocalPathLink) => {
    try {
        if (!LocalPathLink) return null
        const response = await cloudinary.uploader.upload(LocalPathLink, {
            resource_type: "auto"
        })
        fs.unlinkSync(LocalPathLink)
        return response
    } catch (error) {
        fs.unlinkSync(LocalPathLink)
        return null
    }

}

const deleteOnCloudinary = async (publicId) => {
    try {
        if (!publicId) return null
        const response = await cloudinary.uploader.destroy(publicId)
        return response
    } catch (error) {
        return null
    }
}

export {
    uploadOnCloudinary,
    deleteOnCloudinary
}