const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const padRoutes = require("./routes/padRoutes");
const Pad = require("./models/Pad");
const path = require("path");
require("dotenv").config();

const app = express();
connectDB();
app.use(cors());
app.use(express.json());

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running successfully!" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory structure for tracking which users have joined which pad
let pads = {};

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // 1. User joins a specific pad
  socket.on("join-pad", async ({ padId, userId, userName }) => {
    socket.join(padId);

    try {
      const pad = await Pad.findById(padId);
      if (!pad) {
        return socket.emit("error", { msg: "Pad not found" });
      }

      // If user is not in pad, add them
      if (!pad.users.includes(userId)) {
        pad.users.push(userId);
        await pad.save();
      }

      if (!pads[padId]) {
        pads[padId] = { users: {} };
      }
      pads[padId].users[userId] = { userId, userName, socketId: socket.id };

      // Send current pad data (sections, authors, references, and paper fields)
      socket.emit("load-pad", {
        sections: pad.sections || [],
        authors: pad.authors || [],
        references: pad.references || [],
        title: pad.title || "",
        abstract: pad.abstract || "",
        keyword: pad.keyword || "",
      });

      // Broadcast updated user list
      io.to(padId).emit("update-users", Object.values(pads[padId].users));
    } catch (err) {
      console.error("❌ Error joining pad:", err);
    }
  });

  // 2. "send-changes": Real-time Quill content updates
  socket.on("send-changes", async ({ padId, sectionId, subId, delta, fullContent, userId, cursor }) => {
    try {
      const pad = await Pad.findById(padId);
      if (!pad) return socket.emit("error", { msg: "Pad not found" });

      // Find the relevant section and update content
      const sectionIndex = pad.sections.findIndex((s) => s.id === sectionId);
      if (sectionIndex !== -1) {
        if (!subId) {
          pad.sections[sectionIndex].content = fullContent;
        } else {
          const subIndex = pad.sections[sectionIndex].subsections.findIndex((sub) => sub.id === subId);
          if (subIndex !== -1) {
            pad.sections[sectionIndex].subsections[subIndex].content = fullContent;
          }
        }
        await pad.save();
      }

      // Broadcast changes to other clients
      socket.to(padId).emit("receive-changes", {
        sectionId,
        subId,
        delta,
        userId,
        cursor: cursor || { index: 0, length: 0 },
      });
    } catch (err) {
      console.error("❌ Error saving changes:", err);
    }
  });

  // 3. "update-pad": Update entire pad structure including sections, authors, references, and paper fields.
  socket.on("update-pad", async ({ padId, sections, authors, references, title, abstract, keyword }) => {
    try {
      const pad = await Pad.findById(padId);
      if (!pad) return;

      pad.sections = sections;
      pad.authors = authors;
      pad.references = references;
      // Update paper fields if provided
      if (title !== undefined) pad.title = title;
      if (abstract !== undefined) pad.abstract = abstract;
      if (keyword !== undefined) pad.keyword = keyword;

      await pad.save();

      // Broadcast updated pad to all clients in this room
      io.to(padId).emit("load-pad", {
        sections: pad.sections,
        authors: pad.authors,
        references: pad.references,
        title: pad.title,
        abstract: pad.abstract,
        keyword: pad.keyword,
      });
    } catch (err) {
      console.error("❌ Error updating pad:", err);
    }
  });

  // 4. Handle user disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    for (const padId in pads) {
      if (!pads[padId]) continue;
      let userToRemove = null;
      for (const uId in pads[padId].users) {
        if (pads[padId].users[uId].socketId === socket.id) {
          userToRemove = uId;
          break;
        }
      }
      if (userToRemove) {
        console.log(`🔻 Removing user: ${userToRemove} from pad ${padId}`);
        delete pads[padId].users[userToRemove];
        io.to(padId).emit("update-users", Object.values(pads[padId].users));
      }
    }
  });

  // 5. If user manually leaves the pad
  socket.on("leave-pad", ({ padId, userId }) => {
    console.log(`❌ User ${userId} left pad ${padId}`);
    if (pads[padId] && pads[padId].users[userId]) {
      delete pads[padId].users[userId];
      io.to(padId).emit("update-users", Object.values(pads[padId].users));
    }
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/pads", padRoutes);

// Start the server
server.listen(4000, () => {
  console.log("✅ Server running on port 4000");
});
