const express=require('express')
const authMiddleWare = require('../middleWares/auth')

const authRouter=express.Router()

const authController=require('../controllers/authController')

/**
 * @route POST api/auth/register
 * @description Register a new user 
 * @access Public
 */
authRouter.post('/register',authController.registerUser)

/** 
 * @route POST api/auth/login
 * @description login user with email and password
 * @access Public
*/
authRouter.post('/login',authController.loginUser)
/**
 * @route GET api/auth/logout
 * @description logout user and delete token
 * @access Pulbic
 */
authRouter.get('/logout',authController.logoutUser)

/**
 * @route GET api/auth/get-me
 * @description get the current loged in detail
 * @access Private
 */
authRouter.get('/get-me',authMiddleWare.authUser,authController.getMe)

/**
 * @rou
 */

module.exports=authRouter