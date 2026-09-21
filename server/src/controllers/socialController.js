import { SocialPost } from "../models/SocialPost.js";
import { Product } from "../models/Product.js";
import { fail, ok } from "../utils/respond.js";

export async function listPosts(_req, res) {
  const posts = await SocialPost.find().sort({ createdAt: -1 });

  // Populate tagged products for Shop The Look
  const allProductIds = posts.flatMap((p) => p.taggedProductIds || []);
  let productsMap = new Map();
  if (allProductIds.length > 0) {
    const dbProducts = await Product.find({ _id: { $in: allProductIds } });
    productsMap = new Map(dbProducts.map((prod) => [prod.id, prod]));
  }

  const enrichedPosts = posts.map((post) => {
    const obj = post.toObject({ virtuals: true });
    obj.taggedProducts = (post.taggedProductIds || [])
      .map((id) => productsMap.get(id))
      .filter(Boolean);
    return obj;
  });

  return ok(res, enrichedPosts, "Social posts fetched.");
}

export async function createPost(req, res) {
  const { caption, image, taggedProductIds } = req.body;
  if (!caption || !caption.trim()) return fail(res, 400, "Post caption is required.");

  const post = await SocialPost.create({
    authorId: req.user.id,
    authorName: req.user.name,
    caption: String(caption).trim(),
    image: image || "/images/kurti1.png",
    taggedProductIds: Array.isArray(taggedProductIds) ? taggedProductIds : []
  });

  return ok(res, post, "Outfit post created successfully.");
}

export async function deletePost(req, res) {
  const { postId } = req.params;
  const post = await SocialPost.findById(postId);
  if (!post) return fail(res, 404, "Social post not found.");

  const isAuthor = post.authorId === req.user.id;
  const isAdmin = req.user.role === "admin" || req.user.role === "master";

  if (!isAuthor && !isAdmin) {
    return fail(res, 403, "You do not have permission to delete this post.");
  }

  await SocialPost.findByIdAndDelete(postId);
  return ok(res, null, "Post deleted successfully.");
}

export async function likePost(req, res) {
  const { postId } = req.params;
  const post = await SocialPost.findById(postId);
  if (!post) return fail(res, 404, "Social post not found.");

  const userId = req.user.id;
  const hasLiked = post.likedBy.includes(userId);

  if (hasLiked) {
    post.likedBy = post.likedBy.filter((id) => id !== userId);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    post.likedBy.push(userId);
    post.likes += 1;
  }

  await post.save();
  return ok(res, { likes: post.likes, liked: !hasLiked }, "Post like toggled.");
}

export async function addComment(req, res) {
  const { postId } = req.params;
  const { text } = req.body;
  if (!text || !String(text).trim()) return fail(res, 400, "Comment text is required.");

  const post = await SocialPost.findById(postId);
  if (!post) return fail(res, 404, "Social post not found.");

  post.comments.push({
    authorId: req.user.id,
    authorName: req.user.name,
    text: String(text).trim()
  });

  await post.save();
  return ok(res, post.comments, "Comment added successfully.");
}
