import User from "../models/userModel.js"
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';


export const create = async(req,res)=>{
    try{

        const userData= new User(req.body);
        const {email}=userData;
        const userExist =await User.findOne({email}); 
        if (userExist ){
            return res.status(400).json({message:"User already exists."});

        }
        const savedUser =await userData.save();
        res.status(200).json(savedUser);

    }catch (error){
        res.status(500).json({error:"Internal Server error."});
    }
}

export const fetch =async (requestAnimationFrame, res)=>{
    try {
         const users = await User.find();
         if(users.length === 0){
            return res.status(404).json({message : "User Not Found."})
         }
         res.status(200).json(users);

    }catch (error){
        res.status(500).json({error:"Internal Server error."});
    }
}
export const  update = async(req, res)=>{
    try {
        const id = req.params.id;
        const userExist = await User.findById({_id:id})
        if (!userExist){
            return res.status(404).json({message:"User Not Found."})
        }
        const updateUser = await User.findByIdAndUpdate(id,req.body,{new:true})
        res.status(201).json(updateUser);

    }catch(error){
        res.status(500).json({error:"Internal Server error."}); 
    }
}
export const deleteUser = async (req, res) =>{
    try{
         const id= req.params.id;
         const userExist =await User.findById({_id:id});
         if (!userExist){
            return res.status(404).json({message: "User Not Found."})
         }
         await User.findByIdAndDelete(id);
         res.status(201).json({message:"User deleted successfully."})

        }
        catch(error){
             res.status(500).json({error:"Internal Server error."}); 
}
}


export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, 'your_secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

  