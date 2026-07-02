import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Message cannot be empty'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'file', 'system'],
    default: 'text',
  },
  fileUrl: {
    type: String,
    default: '',
  },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message;
