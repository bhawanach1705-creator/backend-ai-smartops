import mongoose from 'mongoose';
const schema = new mongoose.Schema({user: {type: mongoose.Schema.Types.ObjectId, required: true, unique: true}, messages: {type: [mongoose.Schema.Types.Mixed], default: []}, busy: {type: Boolean, default: false}}, {timestamps:true});
export default mongoose.model('AIConversation', schema);
