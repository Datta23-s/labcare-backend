const { Notification } = require('../models');

let io = null;

// Store connected users: userId -> socketId
const connectedUsers = new Map();

const initSocket = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Register user
    socket.on('register', (userId) => {
      connectedUsers.set(String(userId), socket.id);
      console.log(`👤 User ${userId} registered on socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
      // Remove user from connected map
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

// Send notification to a specific user
const sendNotification = async (userId, notificationData) => {
  try {
    // Save to database
    const notification = await Notification.create({
      user_id: userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'system',
      link: notificationData.link || null
    });

    // Send via socket if user is connected
    const socketId = connectedUsers.get(String(userId));
    if (socketId && io) {
      io.to(socketId).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Broadcast to all connected users
const broadcastNotification = async (notificationData) => {
  if (io) {
    io.emit('notification', notificationData);
  }
};

module.exports = { initSocket, sendNotification, broadcastNotification };
