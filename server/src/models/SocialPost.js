import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    authorId: String,
    authorName: String,
    text: String
  },
  { timestamps: true, _id: false }
);

const socialPostSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    caption: String,
    image: String,
    likes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] },
    comments: { type: [commentSchema], default: [] },
    taggedProductIds: { type: [String], default: [] }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const SocialPost =
  mongoose.models.SocialPost || mongoose.model("SocialPost", socialPostSchema);
