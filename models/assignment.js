const mongoose = require("mongoose");
const Schema = mongoose.Schema;
main().then(()=>{
    console.log("DB is connected");
})
.catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rakshak');
}


const assignmentSchema = new mongoose.Schema({
    incidentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userdb",
        required: true
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: "ASSIGNED"
    }
});
const Assignment = mongoose.model("Assignment", assignmentSchema);
module.exports = Assignment;