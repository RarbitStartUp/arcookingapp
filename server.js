// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws"; // Import the WebSocket.Server
import cors from "cors"; // Import the cors middleware
import { fileURLToPath } from "url"; // Import fileURLToPath function
import { uploadVideo } from "./api/uploadVideo.js";

import path from "path";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true }); // Create WebSocketServer instance
const port = 3000;

// Get the directory path using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use cors middleware
app.use(cors());

app.use(
  express.static(path.join(__dirname, "public"), {
    // Use path.join to join __dirname and "public"
    extensions: ["html", "js"],
    type: "application/javascript",
  })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html")); // Use path.join to join __dirname, "public", and "index.html"
});

// Step 0. Handle video upload
// Handle video upload
app.post("/api/uploadVideo", express.json(), uploadVideo);

// Use the WebSocket service with the HTTP server
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    console.log("WebSocket connection established");
    wss.emit("connection", ws, request);
  });
});

// Step 1. get CHECKBOX FINAL Checklist
app.get("/api/uploadVideo", async (req, res) => {
  try {
    const result = await uploadVideo();
    console.error("Server Step 1 :", result);
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Step 2. post Final CheckList to checkedList API and return result
// app.post("/api/checkedList", express.json(), async (req, res) => {
//   const { jsonData, frames } = req.body; // Assuming the client sends jsonData in the request body

//   try {
//     const result = await checkedList(jsonData, frames);
//     console.error("Server Step 2 :", result);
//     res.json(result);
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

app.listen(port, "0.0.0.0", () => {
  // console.log(`Server listening at http://localhost:${port}`);
  // console.log(`Server is running on port ${port}`);
  console.log("Server listening at http://0.0.0.0:3000");
});
