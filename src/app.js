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

app.use("/api/v1/users", userRouter)

export { app }