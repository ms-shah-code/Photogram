import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from '../models/subscription.model.js'

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user._id;

    // ✅ Validate
    if (!channelId) {
        throw new ApiError(400, "ChannelId is missing!");
    }

    // ✅ Check if channel exists (optional but recommended)
    const channelExists = await User.findById(channelId);
    if (!channelExists) {
        throw new ApiError(404, "Channel (User) not found!");
    }

    // ✅ Check existing subscription
    const existingSub = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    });

    // ✅ If exists → unsubscribe
    if (existingSub) {
        await existingSub.deleteOne();
        return res.status(200).json(
            new ApiResponse(200, null, "Unsubscribed successfully")
        );
    }

    // ✅ Else → subscribe
    const newSubscription = await Subscription.create({
        subscriber: userId,
        channel: channelId
    });

    return res.status(200).json(
        new ApiResponse(200, newSubscription, "Subscribed successfully")
    );
});


const getChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    let { page = 1, limit = 20 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    if (!channelId) {
        throw new ApiError(400, "ChannelId is missing!");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscriber: { $first: "$subscriber" }
            }
        },
        {
            $project: {
                subscriber: 1,
                subscribedAt: "$createdAt"
            }
        },
        { $sort: { subscribedAt: -1 } },
        { $skip: skip },
        { $limit: limit }
    ]);

    return res.status(200).json(
        new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

const getUserSubscribedChannels = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $project: {
                _id: 0,
                channel: 1,
                subscribedAt: "$createdAt"
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalSubscribed: subscribedChannels.length,
                channels: subscribedChannels
            },
            "Subscribed channels fetched successfully"
        )
    );
});


export {
    toggleSubscription
    , getChannelSubscribers
    , getUserSubscribedChannels
}