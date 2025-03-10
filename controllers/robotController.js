import Robot from '../models/Robot.js';
import RobotFinal from '../models/RobotFinal.js';
import RobotPosition from '../models/robotPosition.js';

// Récupérer toutes les adresses IP des robots
export const getRobotIPs = async (req, res) => {
  try {
    const robots = await Robot.find();
    res.json(robots);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching robot IPs' });
  }
};




export const getLatestPosition = async (req, res) => {
  try {
    const latestPosition = await RobotPosition.findOne({ _id: "latest" });
    if (latestPosition) {
      res.json(latestPosition);
    } else {
      res.status(404).json({ error: "❌ No position data found" });
    }
  } catch (error) {
    res.status(500).json({ error: "❌ Error fetching latest position" });
  }
};



export const create = async(req,res)=>{
    try{

        const robotData= new RobotFinal(req.body);
        const {ip}=robotData;
        const robotExist =await RobotFinal.findOne({ip}); 
        if (robotExist){
            return res.status(400).json({message:"Robot already exists."});

        }
        const savedRobot =await robotData.save();
        res.status(200).json(savedRobot);

    }catch (error){
        res.status(500).json({error:"Internal Server error."});
    }
}

export const fetch =async (requestAnimationFrame, res)=>{
    try {
         const robots = await RobotFinal.find();
         if(robots.length === 0){
            return res.status(404).json({message : "Robot Not Found."})
         }
         res.status(200).json(robots);

    }catch (error){
        res.status(500).json({error:"Internal Server error."});
    }
}
export const  update = async(req, res)=>{
    try {
        const id = req.params.id;
        const robotExist = await RobotFinal.findById({_id:id})
        if (!robotExist){
            return res.status(404).json({message:"Robot Not Found."})
        }
        const updateRobot = await RobotFinal.findByIdAndUpdate(id,req.body,{new:true})
        res.status(201).json(updateRobot);

    }catch(error){
        res.status(500).json({error:"Internal Server error."}); 
    }
}
export const deleteRobot = async (req, res) =>{
    try{
         const id= req.params.id;
         const robotExist =await RobotFinal.findById({_id:id});
         if (!robotExist){
            return res.status(404).json({message: "Robot Not Found."})
         }
         await RobotFinal.findByIdAndDelete(id);
         res.status(201).json({message:"Robot deleted successfully."})

        }
        catch(error){
             res.status(500).json({error:"Internal Server error."}); 
}}
export const addConnectedRobot = async (req, res) => {
  try {
    const id = req.params.id;

    // Vérifier si le robot existe dans la table "Robot"
    const robotExist = await Robot.findById(id);
    if (!robotExist) {
      return res.status(404).json({ message: "Robot Not Found." });
    }

    // Vérifier si le robot existe déjà dans la table "RobotFinal"
    const robotFinalExist = await RobotFinal.findOne({ ip: robotExist.ip });
    if (robotFinalExist) {
      return res.status(400).json({ message: "Robot already exists in RobotFinal." });
    }

    // Récupérer les données du body
    const { name,status } = req.body;

    // Valider les données
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: "Invalid or missing name." });
    }
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ message: "Invalid or missing status." });
    }

    // Créer une nouvelle entrée dans la table "RobotFinal"
    const newRobot = new RobotFinal({
      ip: robotExist.ip, // Récupéré depuis "Robot"
      rosVersion:robotExist.rosVersion,
      name,
      status,
    });

    // Sauvegarder dans la base de données
    const savedRobot = await newRobot.save();
    
    // Retourner la réponse
    res.status(201).json(savedRobot);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error." });
  }
};

