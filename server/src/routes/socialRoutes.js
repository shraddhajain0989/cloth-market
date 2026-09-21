import { Router } from "express";
import { addComment, createPost, deletePost, likePost, listPosts } from "../controllers/socialController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", listPosts);
router.post("/", requireAuth, createPost);
router.delete("/:postId", requireAuth, deletePost);
router.post("/:postId/like", requireAuth, likePost);
router.post("/:postId/comments", requireAuth, addComment);

export default router;
