import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Post } from "../models/post.model.js";
import { publishPost } from "./post.controller.js";

const postComment = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { postId } = req.params
    const userId = req.user._id
    if (!postId) {
        throw new ApiError(404, "postId not found or missing")
    }
    if (!content) {
        throw new ApiError(400, "Comment content are required!")
    }
    const post = await Post.findById(postId)
    if (!post) throw new ApiError(404, "Post not found");
    const comment = await Comment.create({
        content: content,
        post: postId,
        commentBy: userId
    })
    comment = await comment.populate("commentBy", "avatar username")
    return res.status(200).json(
        new ApiResponse(200, comment, "comment posted seccessfully")
    )
})

const replyComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    if (!commentId) {
        throw new ApiError(400, "CommentId is missing");
    }
    if (!content) {
        throw new ApiError(400, "Content is required!");
    }

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) throw new ApiError(404, "Comment not found");

    let reply = await Comment.create({
        content,
        commentBy: userId,
        post: parentComment.post,
        parentComment: parentComment._id
    });

    reply = await reply.populate("commentBy", "avatar username fullName");

    return res.status(200).json(
        new ApiResponse(200, reply, "Reply added successfully")
    );
});

const getAllComments = asyncHandler(async (req, res) => {
    const { postId } = req.params
    if (!postId) {
        throw new ApiError(400, "postId are missing")
    }
    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, "Post not found");
    const getcomments = await Comment.aggregate([
        {
            $match: {
                post: new mongoose.Types.ObjectId(postId),
                parentComment: null
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $lookup: {
                from: 'users',
                localField: "commentBy",
                foreignField: '_id',
                as: "commentBy",
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
                commentBy: { $first: "$commentBy" }
            }
        },
        {
            $lookup: {
                from: 'comments',
                localField: '_id',
                foreignField: 'parentComment',
                as: "replies",
                pipeline: [
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: "commentBy",
                            foreignField: '_id',
                            as: "commentBy",
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
                        $addFields: { commentBy: { $first: "$commentBy" } }
                    }
                ]
            }
        }
    ])
    return res.status(200).json(
        new ApiResponse(200, getcomments, "comment successfully fetched")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    if (!commentId) {
        throw new ApiError(400, "CommentId are missing")
    }
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    if (comment.commentBy.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You cannot delete this comment")
    }
    await Comment.deleteMany({ parentComment: commentId })
    await Comment.findByIdAndDelete(commentId)
    return res.status(200).json(
        new ApiResponse(200, {}, "comment deleted successfully")
    )
})

const editComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId) {
        throw new ApiError(400, "CommentId is missing");
    }

    if (!content) {
        throw new ApiError(400, "Comment content is required!");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // ✅ Permission check
    if (comment.commentBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You cannot edit this comment");
    }

    // ✅ Update comment
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedComment,
            "Comment edited successfully"
        )
    );
});

const editReply = asyncHandler(async (req, res) => {
    const { replyId } = req.params;
    const { content } = req.body;

    if (!replyId) {
        throw new ApiError(400, "ReplyId is missing");
    }

    if (!content) {
        throw new ApiError(400, "Reply content is required!");
    }
    const reply = await Comment.findById(replyId);
    if (!reply) {
        throw new ApiError(404, "Reply not found");
    }

    if (!reply.parentComment) {
        throw new ApiError(400, "This is not a reply comment");
    }

    if (reply.commentBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You cannot edit this reply");
    }

    const updatedReply = await Comment.findByIdAndUpdate(
        replyId,
        { content },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedReply,
            "Reply edited successfully"
        )
    );
});


export {
    postComment,
    getAllComments,
    deleteComment,
    editComment,
    editReply,
    replyComment
}