const mongoose =require('mongoose')

const  tokenBlackListSchema=new mongoose.Schema({
  token:{
    type:String,
    required:true,
  }
},{
  timestamps:true
})

const tokenBlackListModel=mongoose.model("blackListedToken",tokenBlackListSchema)

module.exports=tokenBlackListModel