P2P File Sharing (Serverless)
A lightweight, browser-based peer-to-peer file sharing application built with React + Vite.
Files are transferred directly between users using WebRTC, with no server required for file storage or transmission.
Features
•	Direct peer-to-peer file transfer using WebRTC
•	Serverless architecture: no backend for file handling
•	Simple UI for generating and sharing connection codes
•	Secure connection establishment
•	Fast transfers enabled by Vite HMR during development
Tech Stack
•	React for UI
•	Vite for fast development and bundling
•	WebRTC for peer connections
•	ESLint and Prettier for code quality (expandable)
Getting Started
•	npm install
•	npm run dev
•	npm run build  (build for production)
•	npm run preview  (preview build)
Notes
•	Signaling can be handled through temporary channels (e.g., WebSocket or public STUN servers), but the file data never touches a server.
•	Extend ESLint or TypeScript rules as needed for production environments.
