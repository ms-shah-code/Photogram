import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // 🔥 Post Like
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      default: null
    },

    // 🔥 Comment Like
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    }
  },
  { timestamps: true }
);

// ✅ Prevent user from liking the same post/comment twice
likeSchema.index({ likedBy: 1, post: 1 }, { unique: true });
likeSchema.index({ likedBy: 1, comment: 1 }, { unique: true });

export const Like = mongoose.model("Like", likeSchema);
