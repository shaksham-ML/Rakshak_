require("dotenv").config();
const express=require("express");
const app = express();
const mongoose = require("mongoose");
const userdb = require("./models/userdb.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate");
const Team = require("./models/team.js");
const Assignment = require("./models/assignment.js");


let dbPromise;

async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (!dbPromise) {
        dbPromise = mongoose.connect(process.env.MONGODB_URI)
            .catch(err => {
                dbPromise = null;
                throw err;
            });
    }

    await dbPromise;
    console.log("DB is connected");
}


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
app.use(express.json());

app.get("/",(req,res)=>{
    res.send("root is running");
});


app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("Database connection error:", err);
        res.status(500).send("Database connection error");
    }   
});
//priority engine 
function calculatePriority(data){
    let score = 0;
    if(Number(data.peopleAffected) >= 20){
        score += 4;
    }else if(Number(data.peopleAffected) >= 10){
        score += 3;
    }else if(Number(data.peopleAffected) >= 5){
        score += 2;
    }else{
        score +=1;
    }
    if (Number(data.medicalEmergency) > 0) {
        score += 3;
    }
    if (data.trapped === "true" || data.trapped === true) {
        score += 3;
    }
    if (score >= 8) {
        return "CRITICAL";
    } else if (score >= 6) {
        return "HIGH";
    } else if (score >= 3) {
        return "MEDIUM";
    } else {
        return "LOW";
    }
}

//5-digit incident number for user
async function generateIncidentNumber() {

    let incidentNo;
    let exists = true;

    while (exists) {

        incidentNo =
            Math.floor(
                10000 + Math.random() * 90000
            ).toString();

        exists =
            await userdb.findOne({
                incidentNo: incidentNo
            });
    }

    return incidentNo;
}

//5-digit number for team
async function generateTeamCode() {

    let teamCode;
    let exists = true;

    while (exists) {

        teamCode =
            Math.floor(
                10000 + Math.random() * 90000
            ).toString();

        exists =
            await Team.findOne({
                teamCode: teamCode
            });
    }

    return teamCode;
}

function getRequiredCapabilities(data) {
    const capabilities = [];
    if (data.trapped === "true" || data.trapped === true) {
        capabilities.push("RESCUE");
    }
    if (Number(data.medicalEmergency) > 0) {
        capabilities.push("MEDICAL");
    }
    return capabilities;
}

//Distance Calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


//Register disaster route
app.get("/api/user",async (req,res)=>{
   res.render("user.ejs");
});

//Index Route
app.get("/RAKSHAK",async (req,res)=>{
    const allTeams = await Team.find({});
    res.render("index.ejs",{allTeams});
});
//saving user information in DB
app.post("/api/dashboard",async (req,res)=>{ 
    console.log(req.body);
    const data = req.body.userdb;
    const incidentNo = await generateIncidentNumber();
    data.priority = calculatePriority(data);
    data.requiredCapabilities = getRequiredCapabilities(data);//deciding priority
    const newIncident = new userdb(data);
    await newIncident.save();
    res.redirect(`/incident/status/${newIncident._id}`);
});


app.get("/incident/status/:id", async (req, res) => {
    const incident = await userdb.findById(req.params.id);

    if (!incident) {
        return res.status(404).send("Incident not found");
    }

    res.render("incidentStatus.ejs", {
        incident
    });
});
//team route
app.get("/api/team/register", (req, res) => {
    res.render("teamRegister.ejs");
});

//user login
app.get("/incident/login", (req, res) => {

    res.render("incidentLogin.ejs");

});
app.post("/api/incident/login", async (req, res) => {

    try {

        const { incidentNo } = req.body;

        const incident =
            await userdb.findOne({
                incidentNo: incidentNo
            });

        if (!incident) {

            return res.send(
                "Invalid Incident Number"
            );

        }

        req.session.incidentId =
            incident._id;

        res.redirect(
            "/incident/status"
        );

    } catch (error) {

        console.log(error);

        res.status(500).send(
            "Unable to find incident"
        );

    }

});

//incident status route
app.get("/incident/status", async (req, res) => {

    try {

        if (!req.session.incidentId) {

            return res.redirect(
                "/incident/login"
            );

        }

        const incident =
            await userdb.findById(
                req.session.incidentId
            );

        if (!incident) {

            return res.redirect(
                "/incident/login"
            );

        }

        res.render("incidentStatus.ejs", {
            incident
        });

    } catch (error) {

        console.log(error);

        res.status(500).send(
            "Unable to load incident"
        );

    }

});
app.post("/api/teams", async (req, res) => {
    try {
        const data = req.body.team;
        const teamCode = await generateTeamCode();
        const newTeam = new Team({
            teamCode:teamCode,
            name: data.name,
            latitude: data.latitude,
            longitude: data.longitude,
            capabilities: data.capabilities || [],
            capacity: data.capacity,
            status: "AVAILABLE"
        });
        await newTeam.save();
        console.log(req.body);
        res.redirect(`/team/dashboard/${newTeam._id}`);
    } catch (err) {
        console.log(err);
        res.status(500).send("Failed to register team");
    }
});

app.get("/api/incidents",async (req,res)=>{
    const incidents = await userdb.find();
    res.render("incident.ejs",{incidents});
})

//Allocation route

app.get("/api/allocate", (req, res) => {
    res.send("Allocation route is running");
});

app.post("/api/allocate", async (req, res) => {
    const { incidentId } = req.body;
    const incident = await userdb.findById(incidentId);
    if (!incident) {
        return res.status(404).json({
        message: "Incident not found"
        });
    }
    const teams = await Team.find({
            status: "AVAILABLE"
    });
    const suitableTeams = teams.filter(team => {
        return incident.requiredCapabilities.every(capability =>
            team.capabilities.includes(capability)
            );
    });
    if (suitableTeams.length === 0) {
            return res.json({
                message: "No suitable team available"
            });
        }
    const recommendations = suitableTeams.map(team => {
    const distance = calculateDistance(
            incident.latitude,
            incident.longitude,
            team.latitude,
            team.longitude
    );
    return {
                teamId: team._id,
                teamName: team.name,
                distance: Number(distance.toFixed(2)),
                capabilities: team.capabilities
            };
    });
    recommendations.sort((a, b) => a.distance - b.distance);
    const bestTeam = recommendations[0];
    res.json({
            incidentId: incident._id,
            recommendedTeam: bestTeam,
            allSuitableTeams: recommendations
        });

    }
);

//Assignment route
app.post("/api/assign", async (req, res) => {
    try {
        const { incidentId, teamId } = req.body;
        const incident = await userdb.findById(incidentId);
        const team = await Team.findById(teamId);
        if (!incident) {
            return res.status(404).json({
                message: "Incident not found"
            });
        }
        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }
        if (team.status !== "AVAILABLE") {
            return res.status(400).json({
                message: "Team is not available"
            });
        }
        const assignment = await Assignment.create({
            incidentId: incident._id,
            teamId: team._id
        });
        team.status = "BUSY";
        team.assignedIncident=incident._id;
        await team.save();
        incident.status = "ASSIGNED";
        await incident.save();
        res.status(201).json({
            message: "Team successfully assigned",
            assignment,
            team: team.name,
            incidentStatus: incident.status
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Assignment failed"
        });
    }
});


//Status Update Route
app.put("/api/incidents/:id/status", async (req, res) => {

    try {

        const { status, teamId } = req.body;

        const allowedStatuses = [
            "REPORTED",
            "ASSIGNED",
            "IN_PROGRESS",
            "RESOLVED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const incident = await userdb.findById(req.params.id);

        if (!incident) {
            return res.status(404).json({
                message: "Incident not found"
            });
        }

        // Update incident status
        incident.status = status;

        await incident.save();


        // Update Assignment status
        if (teamId) {

            let assignmentStatus = status;

            await Assignment.findOneAndUpdate(
                {
                    incidentId: incident._id,
                    teamId: teamId
                },
                {
                    status: assignmentStatus
                }
            );

        }


        // Incident resolved
        if (status === "RESOLVED" && teamId) {

            await Team.findByIdAndUpdate(
                teamId,
                {
                    status: "AVAILABLE",
                    assignedIncident: null
                }
            );

        }


        res.redirect(`/team/dashboard/${teamId}`);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Failed to update status"
        });

    }

});

//team login
app.get("/team/login", (req, res) => {

    res.render("teamLogin.ejs");

});


app.post("/api/team/login", async (req, res) => {

    try {

        const { teamCode } = req.body;

        const team =
            await Team.findOne({
                teamCode: teamCode
            });

        if (!team) {

            return res.send(
                "Invalid Team Code"
            );

        }

        req.session.teamId =
            team._id;

        req.session.userType =
            "TEAM";

        res.redirect(
            `/team/dashboard/${team._id}`
        );

    } catch (error) {

        console.log(error);

        res.status(500).send(
            "Team login failed"
        );

    }

});

//Team Dashboard
app.get("/team/dashboard/:id", async (req, res) => {
    try {
        const teamCode = await generateTeamCode();
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).send("Team not found");
        }
        const assignments = await Assignment.find({
            teamId: team._id
        }).populate("incidentId");
        res.render("teamDashboard.ejs", {
            team,
            assignments
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong");
    }
});


//admin dashboard
app.get("/api/admin/dashboard", async (req, res) => {
    try {
        const incidents = await userdb.find().sort({
            createdAt: -1
        });
        const teams = await Team.find().populate("assignedIncident");
        const totalIncidents = incidents.length;
        const criticalIncidents = incidents.filter(
            incident => incident.priority === "Critical"
        ).length;
        const activeIncidents = incidents.filter(
            incident =>
                incident.status === "ASSIGNED" ||
                incident.status === "IN_PROGRESS"
        ).length;
        const availableTeams = teams.filter(
            team => team.status === "AVAILABLE"
        ).length;
        res.json({
            statistics: {
                totalIncidents,
                criticalIncidents,
                activeIncidents,
                totalTeams: teams.length,
                availableTeams
            },
            incidents,
            teams
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Failed to load dashboard"
        });
    }
});

app.get("/api/admin/assignments", async (req, res) => {
    try {

        const assignments = await Assignment.find()
            .populate("incidentId")
            .populate("teamId")
            .sort({ assignedAt: -1 });

        res.json(assignments);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Failed to load assignment history"
        });

    }
});
//Dashboard Route
app.get("/admin/dashboard", (req, res) => {
    res.render("adminDashboard.ejs");
});

//allocation route
app.patch("/api/admin/incidents/:incidentId/allocate", async (req, res) => {
    try {
        const { incidentId } = req.params;
        const { teamId } = req.body;

        const incident = await userdb.findById(incidentId);
        const team = await Team.findById(teamId);

        if (!incident) {
            return res.status(404).json({
                message: "Incident not found"
            });
        }

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (team.status !== "AVAILABLE") {
            return res.status(400).json({
                message: "Team is not available"
            });
        }

        incident.status = "ASSIGNED";
        incident.assignedTeam = team._id;

        team.status = "BUSY";
        team.assignedIncident = incident._id;

        await incident.save();
        await team.save();

        res.json({
            message: "Team allocated successfully",
            incident,
            team
        });

    } catch (err) {
        console.log(err);

        res.status(500).json({
            message: "Failed to allocate team"
        });
    }
});
if (require.main === module) {
    app.listen(process.env.PORT || 8080, () => {
        console.log("Server is running on port 8080");
    });
}
module.exports = app;