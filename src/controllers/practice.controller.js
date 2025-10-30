import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import jwt from 'jsonwebtoken'
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userid) => {
    try {
        const user = await User.findById(userid)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { username, fullName, password, email } = req.body
    if ([fullName, username, password, email].some((field) => field.trim() === "")) {
        throw new ApiError(400, "All fields are required!")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    const user = await User.create({
        username,
        fullName,
        password,
        email
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "Unable to create user. Please try again later.")
    }
    return res.status(201).json(
        new ApiResponse(
            201,
            createdUser,
            "User registered successfully"
        )
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body
    if ([username, email, password].some((field) => field.trim() === "")) {
        throw new ApiError(400, "All fields are required!")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User are not found or register")
    }
    const isPasswordValidate = await user.isPasswordCorrect(password)
    if (!isPasswordValidate) {
        throw new ApiError(400, "password are wrong")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    if (!loggedInUser) {
        throw new ApiError(404, "User are not found or register")
    }
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                loggedInUser,
                "User logged successfuly"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findOneAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User are successfully logout"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const storedRefreshToken = req.cookies?.refreshToken
    if (!storedRefreshToken) throw new ApiError(401, "unauthorized request!");
    try {
        const decoded = jwt.verify(storedRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        if (!decoded) {
            throw new ApiError(401, "RefreshToken are expired or invalid")
        }
        const user = await User.findById(decoded._id)
        if (!user) {
            throw new ApiError(404, "User are not exist")
        }
        if (user.refreshToken !== storedRefreshToken) {
            throw new ApiError(401, "RefreshToken are expired or invalid")
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
        const options = {
            httpOnly: true,
            secure: true
        }
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken, refreshToken: refreshToken
                    },
                    "AccessToken refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { newPassword, oldPassword } = req.body
    if (!newPassword || !oldPassword) {
        throw new ApiError(400, "password are required")
    }
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(404, "User are not found")
    }
    const isValidatePassword = await user.isPasswordCorrect(oldPassword)
    if (!isValidatePassword) {
        throw new ApiError(400, "Old password are incorrect")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res.status(200)
        .json(
            new ApiResponse(200, {}, "Password successfully changed")
        )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-password -refreshToken")
    if (!user) {
        throw new ApiError(404, "User are not found")
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            { user },
            "User Successfully fetched"
        )
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { username, fullName, email } = req.body;

    if (!username || !fullName || !email) {
        throw new ApiError(400, "All fields are required!");
    }

    if (username.length < 3) {
        throw new ApiError(400, "Username must be at least 3 characters long");
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format");
    }

    // Email duplicate check
    const ExistingEmailUser = await User.findOne({
        email,
        _id: { $ne: req.user?._id }
    });
    if (ExistingEmailUser) {
        throw new ApiError(409, "Email already exists");
    }

    // Username duplicate check
    const ExistingUsernameUser = await User.findOne({
        username,
        _id: { $ne: req.user?._id }
    });
    if (ExistingUsernameUser) {
        throw new ApiError(409, "Username already exists");
    }

    // Update user
    const user = await User.findById(req.user._id);

    user.email = email;
    user.username = username;
    user.fullName = fullName;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Account details updated successfully"
        )
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User are not found!")
    }
    let avatarLocalPath;
    if (req.file) {
        avatarLocalPath = req.file?.path
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file are required!")
    }
    if (user?.avatar?.public_id) {
        await deleteOnCloudinary(user?.avatar?.public_id)
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar) {
        throw new ApiError(500, "something went wrong while uploading avatar")
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: {
                    url: avatar.url,
                    public_id: avatar.public_id
                }
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")
    return res.status(200).json(
        new ApiResponse(
            200,
            { updatedUser },
            "Avatar successfully updated"
        )
    )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    // multer file check
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is required!");
    }

    // delete old cover image if exists
    if (user.coverImage?.public_id) {
        await deleteOnCloudinary(user.coverImage.public_id);
    }

    // upload new cover image
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage) {
        throw new ApiError(500, "Something went wrong while uploading the cover image");
    }

    // update user document
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: {
                    url: coverImage.url,
                    public_id: coverImage.public_id
                }
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(
            200,
            { updatedUser },
            "Cover image successfully updated"
        )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: { username: username }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $lookup: {
                from: "posts",
                localField: "_id",
                foreignField: "owner",
                as: "posts"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                channelSubscribedCount: { $size: "$subscribedTo" },
                postCount: { $size: "$posts" },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [
                                new mongoose.Types.ObjectId(req.user?._id),
                                "$subscribers.subscriber"
                            ]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                email: 1,
                postCount: 1,
                isSubscribed: 1,
                subscriberCount: 1,
                channelSubscribedCount: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found");
    }

    return res.status(200).json({
        status: 200,
        data: channel[0],
        message: "Channel profile fetched successfully"
    });
});

const getWatchHistory = asyncHandler(async (req, res) => {

})

const getUser = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {}
        },
       {
        $lookup:{
            from:"posts",
            foreignField:"_id",
            localField:"owner",
            as:"ownerDetails"
        }
       },
       {
        $lookup:{
            from:"posts",
            foreignField:"_id",
            localField:"comment",
            as:"commentDetails"
        }
       },
       {
        $lookup:{
            from:"posts",
            foreignField:"_id",
            localField:"liked",
            as:"likeDetails"
        }
       }
    ])
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}