import Router from 'express';
import { deletePost, getAllPosts, getPostById,  publishPost, updatePost } from '../controllers/post.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/getAll").get(verifyJWT, getAllPosts);
router.route("/create").post(verifyJWT, publishPost);
router.route("/update/:postId").put(verifyJWT, updatePost);
router.route("/delete/:postId").delete(verifyJWT, deletePost);
router.route("/:postId").get(verifyJWT, getPostById);


export default router;
