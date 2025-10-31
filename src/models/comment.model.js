import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    commentBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },

    // ✅ this makes replies possible
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    }
  },
  { timestamps: true }
);

export const Comment = mongoose.model("Comment", commentSchema);
