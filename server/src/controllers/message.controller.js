import Message from '../models/message.model.js';

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { content, type, fileUrl } = req.body;
    const { meetingId } = req.params;

    const message = await Message.create({
      meeting: meetingId,
      sender: req.user._id,
      content,
      type: type || 'text',
      fileUrl: fileUrl || '',
    });

    // Populate sender details
    await message.populate('sender', 'name email avatar');

    res.status(201).json({
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all messages of a meeting
export const getMeetingMessages = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const messages = await Message.find({ meeting: meetingId })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
