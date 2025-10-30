import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            url: {
                type: String,
                default: "",
            },
            public_id: {
                type: String,
                default: "",
            }

        },
        coverImage: {
            url: {
                type: String,
                default: "",
            },
            public_id: {
                type: String,
                default: "",
            }
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId, // ✅ FIXED
                ref: "Post",
            },
        ],
        refreshToken: {
            type: String,
        },
    },
    { timestamps: true }
);

// ✅ FIXED THIS ISSUE — use normal function()
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// ✅ compare password
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// ✅ generate access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

// ✅ FIXED refresh token expiry
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY, // ✅ FIXED
        }
    );
};

export const User = mongoose.model("User", userSchema);
