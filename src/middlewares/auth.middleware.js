import jwt from 'jsonwebtoken'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'

const verifyJWT = asyncHandler(async (req,res,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Brearer ","")
        if (!token) {
            throw new ApiError(400,"Unauthorized request!")
        }
        const decoded  = await jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decoded._id).select("-password -refreshToken")
        if (!user) {
            throw new ApiError(400,"Invalid accessToken")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, "invalid AccessToken!!")
    }
})

export {
    verifyJWT
}