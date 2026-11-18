const mongoose = require("mongoose");
const Schema = mongoose.Schema;

main().then(()=>{
    console.log("DB is connected");
})
.catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rakshak');
}


const userdbSchema = new Schema({
    type:{
        type:String,
        required:true
    },
    latitude:{
        type:Number,
        required:true
    },
    longitude:{
        type:Number,
        required:true
    },
    peopleAffected:{
        type:Number,
        required:true
    },
    medicalEmergency:{
        type:Number,
        default:0
    },
    trapped:{
        type:Boolean,
        default:false
    },
    priority:{
        type:String,
        enum:["LOW","MEDIUM","HIGH","CRITICAL"],
        default:"Medium"
    },
    requiredCapabilities: [{
        type: String
    }],

    requiredResources: [{
        type: String
    }],

    status: {
        type: String,
        default: "Reported"
    },
    status:{
        type:String,
        enum: [
            "Reported",
            "ASSIGNED",
            "IN_PROGRESS",
            "RESOLVED"
        ],
        default:"Reported"
    },
    assignedTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        default: null
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
});

const userdb = mongoose.model("userdb",userdbSchema);
module.exports = userdb;