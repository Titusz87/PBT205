# PBT205 Project

This repository contains the three prototype applications for the PBT205 assessment:

1. Chat Application - A real-time chat system using RabbitMQ middleware
2. Trading System - (to be added)
3. Contact Tracing - (to be added)

## Setup Instructions

Each application has its own directory with specific instructions.

# Real-time Chat Application

A feature-rich chat application built with Node.js, Socket.IO, and RabbitMQ. Features include real-time messaging, emoji reactions, file sharing, typing indicators, and user presence.

## Features

- 💬 Real-time messaging across multiple chat rooms
- 👥 User presence indicators and online user list
- ⌨️ Typing indicators
- 😊 Emoji reactions to messages
- 📎 File and image sharing
- 🚀 Powered by RabbitMQ message broker

## Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Titusz87/PBT205.git
   cd PBT205
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Development

To run the server in development mode with auto-restart:
```bash
npm run dev
```

## Usage

1. Enter your username and select a room
2. Start chatting!
3. Double-click on messages to add reactions
4. Click the attachment button to share files
5. See who's online in the sidebar
6. Watch for typing indicators when others are composing messages

## File Sharing

- Supported file size: up to 5MB
- Images will show previews in the chat
- Other files will have download links

## Troubleshooting

If you encounter any issues:

1. Make sure all dependencies are installed:
   ```bash
   npm install
   ```

2. Check if the RabbitMQ server is accessible
3. Ensure port 3000 is available on your machine
4. Check the console for error messages

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request