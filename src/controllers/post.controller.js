import {Post} from '../models/post.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';
import {User} from '../models/user.model.js';
import { deleteOnCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import { Comment } from '../models/comment.model.js';

const getAllPosts = asyncHandler(async (req, res) => {
    let { postId, limit = 10, page = 1, search = "", userId } = req.query
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit
    const posts = await Post.aggregate([
        {
            $sort: { createdAt: -1 }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
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
                owner: { $first: "$owner" }
            }
        },
        ...(search ? [
            {
                $match: {
                    $or: [
                        { "owner.username": { $regex: search, $options: "i" } },
                        { title: { $regex: search, $options: "i" } },
                        { description: { $regex: search, $options: "i" } },
                    ]
                }
            }
        ] : []),
        { $skip: skip },
        { $limit: limit }
    ])
    return res.status(200).json(
        new ApiResonse(
            200,
            { posts },
            "Posts are successfully fetched"
        )
    )
})

const publishPost = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description) {
        throw new ApiError(400, "title or description are missing")
    }
    if (!req.file?.path) {
        throw new ApiError(400, "image are missing")
    }
    const imgPath = req.file?.path
    const postImg = await uploadOnCloudinary(imgPath)
    if (!postImg) {
        throw new ApiError(500, "something went wrong while uploading post")
    }
    const post = await Post.create({
        postImg: {
            url: postImg.url,
            public_id: postImg.public_id
        },
        title,
        description,
        owner: req.user?._id
    })
    return res.status(200).json(
        new ApiResponse(
            200,
            post,
            "Post uploaded successfully"
        )
    )
})

const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params
    if (!postId) {
        throw new ApiError(404, "Post are not found")
    }
    const post = await Post.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(postId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
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
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" },
                isLiked: {
                    $in: [req.user._id, "$likes.likedBy"]
                }
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            $addFields: {
                commentCount: { $size: "$comments" }
            }
        },
        {
            $project: {
                "likes.likedBy": 0,
                comments: 0
            }
        }
    ])
    if (!post.length) {
        throw new ApiError(404, "Post not found")
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            post[0],
            "post fetched successfully"
        )
    )
})

const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params
    const { title, description } = req.body;
    if (!postId) {
        throw new ApiError(404, "Post not found")
    }
    let newImgPath;
    if (req.file?.path) {
        newImgPath = req.file.path
    }
    const updateData = {};
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (newImgPath) {
        const existingPost = await Post.findById(postId)
        if (!existingPost) {
            throw new ApiError(404, "Post not found")
        }
        if (existingPost.postImg?.public_id) {
            await deleteOnCloudinary(existingPost.postImg.public_id)
        }
        const newPost = await uploadOnCloudinary(newImgPath)
        if (!newPost) {
            throw new ApiError(500, "Error while uploading post!")
        }
        updateData.postImg = { url: newPost.url, public_id: newPost.public_id }
    }
    const post = await Post.findByIdAndUpdate(
        postId,
        {
            $set: updateData
        },
        { new: true }
    )
    return res.status(200).json(
        new ApiResponse(
            200,
            post,
            "Post updated successfully"
        )
    )
})

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params
    if (!postId) {
        throw new ApiError(404, "Post not found")
    }
    const post = await Post.findById(postId)
    if (!post) {
        throw new ApiError(404,"Post not found")
    }
    if (post.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403,"You cannot delete this post")
    }
    await deleteOnCloudinary(post.postImg.public_id)
    await Post.findByIdAndDelete(postId)
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Post successfully deleted"
        )
    )
})

const getUserPosts = asyncHandler(async (req, res) => {
    let {userId,limit=10,page=1} = req.query
    limit = parseInt(limit)
    page= parseInt(page)
    const skip = (page-1)*limit
    if (!userId) {
        throw new ApiError(400,"UserId are required!")
    }
    const getPost = await Post.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $skip:skip
        },
        {
            $limit:limit
        }
    ])
     if (getPost.length ===0) {
        throw new ApiError(400,"No posts found for this user")
     }
        return res.status(200).json(
        new ApiResponse(
            200,
            {posts:getPost},
            "User posts fetched successfully"
        )
    )
    
})

export {
    getAllPosts,
    publishPost,
    updatePost,
    deletePost,
    getUserPosts,
    getPostById
}