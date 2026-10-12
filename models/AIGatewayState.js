import mongoose from 'mongoose';
export default mongoose.model('AIGatewayState', new mongoose.Schema({_id:String, blocked:Boolean, message:String, status:Number}, {timestamps:true}));
