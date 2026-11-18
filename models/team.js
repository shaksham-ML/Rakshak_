const mongoose = require("mongoose");
const Schema = mongoose.Schema;
main().then(()=>{
    console.log("DB is connected");
})
.catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rakshak');
}


const teamSchema = new mongoose.Schema({
    teamCode: {
    type: String,
    required: true,
    unique: true
    },
    name: {
        type: String,
        required: true
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    capabilities: [{
        type: String
    }],
    status: {
        type: String,
        enum:["AVAILABLE","BUSY"],
        default: "AVAILABLE"
    },
    capacity: {
        type: Number,
        default: 5
    },
    assignedIncident:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"userdb",
        default:null
    }
});
const Team = mongoose.model("Team", teamSchema);
module.exports = Team;