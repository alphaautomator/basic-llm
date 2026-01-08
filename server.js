import express from "express";
import { getResponse } from "./bot.js";

const app = express();
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({
      error: "sessionId and message are required"
    });
  }

  const result = await getResponse(sessionId, message);
  res.json(result);
});

app.listen(3000, () => {
  console.log("Intent State Machine API running on port 3000");
});
