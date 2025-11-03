import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'

const app = express()

app.use(cors({
    origin:'http://localhost:5173',
    credentials:true
}))
app.use(express.json({limit:"20kb"}))
app.use(express.urlencoded({extended:true,limit:"20kb"}))
app.use(cookieParser())
app.use(express.static("public"))

dotenv.config({
    path: './.env'
})

//user routes
import userRouter from './routes/user.routes.js'
import postRouter from './routes/post.router.js'
import subscriptionRouter from './routes/subscription.routes.js'
import likeRoutes from "./routes/like.routes.js";
import commentRoutes from "./routes/comment.routes.js";

app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/likes", likeRoutes);
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/posts", postRouter)
app.use("/api/v1/users", userRouter)

export { app }