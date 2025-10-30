import mongoose, { Schema } from "mongoose";

const postSchema = new Schema({
    postImg: {
        url: {
            type: String,
            default: ""
        },
        public_id: {
            type: String,
            default: ""
        }
    },
    title: {
        type: String,
        require: true
    },
    description: {
        type: String,
        require: true
    },
    view: {
        type: Number,
        default: 0
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    viewBy: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    visibility: {
        type: String,
        enum: ["public", "private", "only-followers"],
        default: "public"
    }
}, { timestamps: true })

export const Post = mongoose.model("Post", postSchema)