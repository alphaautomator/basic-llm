import readline from "readline";
import { intents } from "./intents.js";
import { getEmbedding } from "./fixed_calculations/embedder.js";
import { cosineSimilarity } from "./fixed_calculations/similarity.js";
import fs from "fs";
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
  
    let bestIntent = null;
    let bestScore = -1;
  
    console.log("\nUser:", message);
    console.log("Similarity scores:");
  
    for (const intent of intents) {
      let intentBest = 0;
  
      for (const vector of intent.vectors) {
        const score = cosineSimilarity(inputVector, vector);
        intentBest = Math.max(intentBest, score);
      }
  
      console.log(
        `  ${intent.name.padEnd(12)} → ${intentBest.toFixed(3)}`
      );
  
      if (intentBest > bestScore) {
        bestScore = intentBest;
        bestIntent = intent;
      }
    }
  
    console.log("Best intent:", bestIntent?.name, "| Score:", bestScore.toFixed(3));
  
    // confidence threshold
    if (bestScore < 0.65) {
        logUnknownInput(message, bestScore);
        return "Sorry, I don't understand yet.";
      }
      
  
    return typeof bestIntent.response === "function"
      ? bestIntent.response()
      : bestIntent.response;
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
