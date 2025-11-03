import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";

const toggleLikePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user?._id;

    if (!postId) {
        throw new ApiError(400, "PostId is missing");
    }

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const existingLike = await Like.findOne({
        likedBy: userId,
        post: postId
    });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(
            new ApiResponse(200, null, "Post unliked successfully")
        );
    }

    const newLike = await Like.create({
        likedBy: userId,
        post: postId
    });

    return res.status(200).json(
        new ApiResponse(200, newLike, "Post liked successfully")
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?._id;

    if (!commentId) {
        throw new ApiError(400, "CommentId is missing!");
    }

    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found!");
    }

    // Check already liked or not
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId,
    });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(
            new ApiResponse(200, null, "Comment unliked successfully")
        );
    }

    // If not liked → create like
    const newLike = await Like.create({
        comment: commentId,
        likedBy: userId,
    });

    return res.status(200).json(
        new ApiResponse(200, newLike, "Comment liked successfully")
    );
});

const getUserLikedPost = asyncHandler(async (req, res) => {
    let { limit = 10, page = 1 } = req.query;

    limit = parseInt(limit);
    page = parseInt(page);
    const skip = (page - 1) * limit;

    const userId = req.user._id;

    const likedPosts = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: { createdAt: -1 }   // ✅ sort pehle
        },
        {
            $skip: skip               // ✅ pagination theek jagah
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: "posts",
                localField: "post",
                foreignField: "_id",
                as: "post"
            }
        },
        { $unwind: "$post" },         // ✅ post ko flatten
        {
            $lookup: {
                from: "users",
                localField: "post.owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        { $addFields: { owner: { $first: "$owner" } } }, // ✅ clean object
        {
            $project: {
                _id: 0,
                post: 1,
                owner: 1,
                likedAt: "$createdAt"   // ✅ like time show
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            likedPosts,
            "User liked posts fetched successfully"
        )
    );
});

const getCommentLikeCount = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "CommentId is missing!");
    }

    const countResult = await Like.aggregate([
        {
            $match: {
                comment: new mongoose.Types.ObjectId(commentId)
            }
        },
        {
            $count: "totalCommentLike"
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalCommentLike: countResult[0]?.totalCommentLike || 0
            },
            "Successfully fetched comment like count"
        )
    );
});

const getReplyLikeCount = asyncHandler(async (req,res) => {
    const {replyId} = req.params
    if (!replyId) {
        throw new ApiError(400,"ReplyId is missing!")
    }
    const totalReplyLike = await Like.countDocuments({
        comment:replyId
    })
    return res.status(200).json(
        new ApiResponse(
            200,
            {totalReplyLike},
            "Reply like count fetched successfully"
        )
    )
});

export {
    toggleLikePost,
    getCommentLikeCount,
    getReplyLikeCount,
    getUserLikedPost,
    toggleCommentLike
}