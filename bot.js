import readline from "readline";
import { intents } from "./intents.js";
import { getEmbedding } from "./fixed_calculations/embedder.js";
import { cosineSimilarity } from "./fixed_calculations/similarity.js";
import fs from "fs";
let lastIntent = null;
function logUnknownInput(text, score) {
    const data = JSON.parse(fs.readFileSync("unknown_inputs.json"));
    data.push({
      text,
      score,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync("unknown_inputs.json", JSON.stringify(data, null, 2));
  }
  
async function prepareIntentEmbeddings() {
  for (const intent of intents) {
    intent.vectors = [];
    for (const example of intent.examples) {
      const vector = await getEmbedding(example);
      intent.vectors.push(vector);
    }
  }
}

async function getResponse(message) {
  const inputVector = await getEmbedding(message);

  const candidates = [];

  // 1. Score ALL intents
  for (const intent of intents) {
    let intentBest = 0;

    for (const vector of intent.vectors) {
      intentBest = Math.max(
        intentBest,
        cosineSimilarity(inputVector, vector)
      );
    }

    candidates.push({
      intent,
      score: intentBest
    });
  }

  // 2. Apply confidence threshold
  const confident = candidates.filter(
    c => c.score >= 0.65
  );

  // 3. Apply transition constraints
  const valid = confident.filter(c => {
    const allowed = c.intent.allowedPreviousIntents;
    if (!allowed) return true; // no constraint
    return allowed.includes(lastIntent);
  });

  // 4. Pick best remaining candidate
  if (valid.length === 0) {
    return "Sorry, I don't understand yet.";
  }

  valid.sort((a, b) => b.score - a.score);
  const chosen = valid[0];

  // 5. Update memory
  lastIntent = chosen.intent.name.replace("_followup", "");

  // 6. Respond
  return typeof chosen.intent.response === "function"
    ? chosen.intent.response()
    : chosen.intent.response;
}


  

// CLI
(async () => {
  await prepareIntentEmbeddings();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("🤖 Bot ready. Type something.");

  rl.on("line", async (input) => {
    const reply = await getResponse(input);
    console.log("Bot:", reply);
  });
})();
