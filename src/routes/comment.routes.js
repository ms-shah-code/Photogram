import { Router } from "express";
import { 
    postComment,
    getAllComments,
    deleteComment,
    editComment,
    editReply
} from "../controllers/comment.controller.js";

import { replyComment } from "../controllers/comment.controller.js"; 
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// ✅ Post a comment on a post
router.post("/:postId", verifyJWT, postComment);

// ✅ Reply to a comment
router.post("/reply/:commentId", verifyJWT, replyComment);

// ✅ Get all comments of a post (along with replies)
router.get("/post/:postId", verifyJWT, getAllComments);

// ✅ Delete comment
router.delete("/:commentId", verifyJWT, deleteComment);

// ✅ Edit comment
router.put("/:commentId", verifyJWT, editComment);

// ✅ Edit reply
router.put("/reply/:replyId", verifyJWT, editReply);

export default router;
