/**
 * Chat Application Server
 * 
 * This server integrates Express (web server), Socket.io (WebSockets),
 * and RabbitMQ (message broker) to create a web-based chat application.
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const amqp = require('amqplib');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Server configuration
const PORT = 3000;
const RABBITMQ_URL = 'amqp://admin:GoLLy7710@vanelsen.chickenkiller.com:5672';
const EXCHANGE_NAME = 'chat_exchange';

// Initialise Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure file uploads
const uploadDir = path.join(__dirname, 'public', 'uploads');
// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ 
    url: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype
  });
});

// Map to store socket connections by username and room
const connections = new Map();
// Map to track typing users in each room
const typingUsers = new Map();
// Map to track users in each room
const roomUsers = new Map();
// Map to store messages with their IDs for reactions
const messages = new Map();

// RabbitMQ connection and channel
let rabbitConnection;
let rabbitChannel;

// Connect to RabbitMQ
async function connectToRabbitMQ() {
  try {
    console.log('Connecting to RabbitMQ...');
    console.log('Using RabbitMQ URL: amqp://admin:***@vanelsen.chickenkiller.com:5672');
    rabbitConnection = await amqp.connect(RABBITMQ_URL);
    rabbitChannel = await rabbitConnection.createChannel();
    
    // Create topic exchange
    await rabbitChannel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    // Retry connection after delay
    setTimeout(connectToRabbitMQ, 5000);
  }
}

// Set up Socket.io connection handling
io.on('connection', async (socket) => {
  console.log('New client connected');
  
  // Handle user joining a room
  socket.on('join', async ({ username, room }) => {
    if (!username || !room) {
      return socket.emit('error', 'Username and room are required');
    }
    
    try {
      // Check if RabbitMQ is connected
      if (!rabbitChannel) {
        return socket.emit('error', 'Chat service is not available. Please try again later.');
      }
      
      // Create a unique queue for this user
      const { queue } = await rabbitChannel.assertQueue('', { exclusive: true });
      
      // Bind queue to the exchange with room as routing key
      await rabbitChannel.bindQueue(queue, EXCHANGE_NAME, room);
      
      // Store connection info
      connections.set(socket.id, { username, room, queue });
      
      // Add user to room users list
      let users = roomUsers.get(room) || [];
      // Remove user if they were already in the room (in case of reconnect)
      users = users.filter(user => user !== username);
      users.push(username);
      roomUsers.set(room, users);
      
      // Join the socket room
      socket.join(room);
      
      // Send join notification ONLY to other users via socket
      socket.to(room).emit('message', {
        id: uuidv4(),
        username: 'System',
        message: `${username} has joined the room`,
        timestamp: new Date().toISOString(),
        room: room,
        reactions: {}
      });
      
      // Also emit a welcome message only to the user who joined
      socket.emit('message', {
        id: uuidv4(),
        username: 'System',
        message: `Welcome to ${room}!`,
        timestamp: new Date().toISOString(),
        room: room,
        reactions: {}
      });
      
      // Set up consumer for this user's queue
      rabbitChannel.consume(queue, (msg) => {
        if (msg !== null) {
          const content = JSON.parse(msg.content.toString());
          
          // Store message for reaction tracking if it's not a system message
          if (content.username !== 'System') {
            messages.set(content.id, content);
          }
          
          // Send message only to this socket (since other users will get
          // the message via their own RabbitMQ consumers)
          socket.emit('message', content);
          
          rabbitChannel.ack(msg);
        }
      });
      
      // Notify user of successful join
      socket.emit('joined', { username, room });
      
      // Broadcast updated user list to all clients in the room
      io.to(room).emit('roomUsers', users);
      
      console.log(`${username} joined room: ${room}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join the room');
    }
  });
  
  // Handle chat messages
  socket.on('sendMessage', (messageData) => {
    const connection = connections.get(socket.id);
    
    if (!connection) {
      return socket.emit('error', 'You must join a room first');
    }
    
    const { username, room } = connection;
    
    // When a user sends a message, they are no longer typing
    const roomTypers = typingUsers.get(room) || new Set();
    if (roomTypers.has(username)) {
      roomTypers.delete(username);
      typingUsers.set(room, roomTypers);
      
      // Broadcast updated typing users
      socket.to(room).emit('typingUsers', Array.from(roomTypers));
    }
    
    // Check if it's a text message or file message
    let messageText, fileInfo;
    
    if (typeof messageData === 'string') {
      messageText = messageData;
    } else {
      messageText = messageData.text || '';
      fileInfo = messageData.file;
    }
    
    const messageId = uuidv4();
    const message = {
      id: messageId,
      username,
      message: messageText,
      timestamp: new Date().toISOString(),
      room,
      reactions: {},
      file: fileInfo
    };
    
    // Store message for reaction tracking
    messages.set(messageId, message);
    
    // Publish message to RabbitMQ only
    // (we'll receive it back through the RabbitMQ consumer)
    rabbitChannel.publish(
      EXCHANGE_NAME,
      room,
      Buffer.from(JSON.stringify(message))
    );
  });
  
  // Handle message reactions
  socket.on('addReaction', ({ messageId, reaction }) => {
    const connection = connections.get(socket.id);
    if (!connection) return;
    
    const { username, room } = connection;
    const message = messages.get(messageId);
    
    if (!message) return;
    
    // Initialize reactions object if it doesn't exist
    if (!message.reactions) {
      message.reactions = {};
    }
    
    // Initialize reaction array if it doesn't exist
    if (!message.reactions[reaction]) {
      message.reactions[reaction] = [];
    }
    
    // Check if user already reacted with this emoji
    const userIndex = message.reactions[reaction].indexOf(username);
    
    if (userIndex === -1) {
      // Add user to the reaction
      message.reactions[reaction].push(username);
    } else {
      // Remove user from the reaction (toggle)
      message.reactions[reaction].splice(userIndex, 1);
      
      // Remove the reaction if no users are left
      if (message.reactions[reaction].length === 0) {
        delete message.reactions[reaction];
      }
    }
    
    // Update the message in the store
    messages.set(messageId, message);
    
    // Broadcast the updated reactions to all users in the room
    io.to(room).emit('messageReaction', { messageId, reactions: message.reactions });
  });
  
  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const connection = connections.get(socket.id);
    if (!connection) return;
    
    const { username, room } = connection;
    let roomTypers = typingUsers.get(room) || new Set();
    
    if (isTyping) {
      roomTypers.add(username);
    } else {
      roomTypers.delete(username);
    }
    
    typingUsers.set(room, roomTypers);
    
    // Broadcast to all users in the room except the sender
    socket.to(room).emit('typingUsers', Array.from(roomTypers));
  });
  
  // Handle room list request
  socket.on('getRooms', async () => {
    // In a real application, you might fetch this from a database
    // For now, we'll use some default rooms
    const rooms = ['main', 'general', 'random', 'tech', 'casual'];
    socket.emit('roomList', rooms);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    const connection = connections.get(socket.id);
    
    if (connection) {
      const { username, room, queue } = connection;
      
      // Remove user from typing list if they were typing
      const roomTypers = typingUsers.get(room);
      if (roomTypers && roomTypers.has(username)) {
        roomTypers.delete(username);
        typingUsers.set(room, roomTypers);
        
        // Broadcast updated typing users
        socket.to(room).emit('typingUsers', Array.from(roomTypers));
      }
      
      // Remove user from room users list
      let users = roomUsers.get(room) || [];
      users = users.filter(user => user !== username);
      roomUsers.set(room, users);
      
      // Broadcast updated user list
      io.to(room).emit('roomUsers', users);
      
      // Send leave notification only via socket.io
      socket.to(room).emit('message', {
        id: uuidv4(),
        username: 'System',
        message: `${username} has left the room`,
        timestamp: new Date().toISOString(),
        room,
        reactions: {}
      });
      
      // Clean up resources
      try {
        if (rabbitChannel) {
          rabbitChannel.cancel(queue);
        }
      } catch (error) {
        console.error('Error cancelling consumer:', error);
      }
      
      connections.delete(socket.id);
      
      console.log(`${username} left room: ${room}`);
    }
    
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await connectToRabbitMQ();
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  if (rabbitChannel) await rabbitChannel.close();
  if (rabbitConnection) await rabbitConnection.close();
  
  process.exit(0);
});