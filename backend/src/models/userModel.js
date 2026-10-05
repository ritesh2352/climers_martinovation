const mongoose=require('mongoose')

const userSchema=new mongoose.Schema({
  userName:{
    type:String,
    unique:[true,"userName alreday exist"],
    required:true
  },
email:{
  type:String,
  unique:['true',"account already exist"],
  required:true
},
password:{
  type:String,
  require:true
}
})

const userModle=mongoose.model("users",userSchema)

module.exports=userModle