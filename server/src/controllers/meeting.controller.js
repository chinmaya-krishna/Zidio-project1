import Meeting from '../models/meeting.model.js';
import { v4 as uuidv4 } from 'uuid';

// Create meeting
export const createMeeting = async (req, res) => {
  try {
    const { title, description } = req.body;

    const meeting = await Meeting.create({
      title,
      description,
      meetingCode: uuidv4().substring(0, 8).toUpperCase(),
      host: req.user._id,
      participants: [{ user: req.user._id }],
      status: 'ongoing',
      startTime: new Date(),
    });

    res.status(201).json({
      message: 'Meeting created successfully',
      meeting,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Join meeting
export const joinMeeting = async (req, res) => {
  try {
    const { meetingCode } = req.params;

    // Case-insensitive meeting code lookup
    const meeting = await Meeting.findOne({ 
      meetingCode: { $regex: `^${meetingCode}$`, $options: 'i' } 
    });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.status === 'ended') {
      return res.status(400).json({ message: 'Meeting has already ended' });
    }

    // Check if user already in meeting
    const alreadyJoined = meeting.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );

    if (!alreadyJoined) {
      meeting.participants.push({ user: req.user._id });
      await meeting.save();
    }

    res.status(200).json({
      message: 'Joined meeting successfully',
      meeting,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all meetings of logged in user
export const getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
      ],
    })
      .populate('host', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ meetings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single meeting
export const getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('actionItems.assignedTo', 'name email');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.status(200).json({ meeting });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// End meeting
export const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only host can end meeting
    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can end the meeting' });
    }

    meeting.status = 'ended';
    meeting.endTime = new Date();
    await meeting.save();

    res.status(200).json({
      message: 'Meeting ended successfully',
      meeting,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete meeting
export const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only host can delete meeting
    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can delete the meeting' });
    }

    await Meeting.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
