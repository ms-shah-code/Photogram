import { Router } from "express";
import { 
    toggleLikePost,
    toggleCommentLike,
    getUserLikedPost,
    getCommentLikeCount,
    getReplyLikeCount
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// ✅ Like / Unlike Post
router.post("/post/:postId", verifyJWT, toggleLikePost);

// ✅ Like / Unlike Comment
router.post("/comment/:commentId", verifyJWT, toggleCommentLike);

// ✅ Get user liked posts
router.get("/posts/user", verifyJWT, getUserLikedPost);

// ✅ Get comment like count
router.get("/comment/:commentId/count", getCommentLikeCount);

// ✅ Get reply like count
router.get("/reply/:replyId/count", getReplyLikeCount);

export default router;
