const mongoose = require("mongoose"); 
const categorySchema = new mongoose.Schema ({
    name:{
        type:String, 
        trim:true
    },
    description:{
     type:String, 
     trim:true
    }, 
    products:[{
          type:mongoose.Schema.Types.ObjectId, 
          ref:"Product"
    }]
})

module.exports = mongoose.model("Category", categorySchema);