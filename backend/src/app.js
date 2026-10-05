const express = require('express')
require("dotenv").config(); 
const cors = require('cors')
const cookieParser=require("cookie-parser")

const app=express()

app.set("trust proxy", 1);

/* requre all the routes here */
const authRouter=require('./routes/authRoute')

app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin:process.env.FRONTEND_URL,
  credentials:true
}))

/*use all the routes here */
app.use("/api/auth",authRouter)



module.exports=app