import readline from "readline";
import { intents } from "./intents.js";
import { getEmbedding } from "./fixed_calculations/embedder.js";
import { cosineSimilarity } from "./fixed_calculations/similarity.js";
import fs from "fs";
let lastIntent = null;
let currentState = null;
let stateEnteredAt = null;
const STATE_TTL_MS = 1000 * 60; // 5 minutes
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

  // ---- 0. State decay check ----
if (
  currentState &&
  Date.now() - stateEnteredAt > STATE_TTL_MS
) {
  if (currentState.onExit) {
    currentState.onExit();
  }
  currentState = null;
  stateEnteredAt = null;
}


  const inputVector = await getEmbedding(message);

  // ---- 1. Score all intents ----
  const scored = [];

  for (const intent of intents) {
    let best = 0;

    for (const vector of intent.vectors) {
      best = Math.max(
        best,
        cosineSimilarity(inputVector, vector)
      );
    }

    scored.push({ intent, score: best });
  }

  // ---- 2. Confidence filter ----
  const confident = scored.filter(s => s.score >= 0.65);
  if (confident.length === 0) {
    return "Sorry, I don't understand yet. and less than 65% confidence";
  }

  // ---- 3. Transition validation ----
  const valid = confident.filter(({ intent }) => {
    if (!intent.allowedPreviousIntents) return true;
    return intent.allowedPreviousIntents.includes(currentState?.name);
  });

  if (valid.length === 0) {
    return "Sorry, I don't understand yet. and not allowed previous intents";
  }

  // ---- 4. Choose best valid intent ----
  valid.sort((a, b) => b.score - a.score);
  const nextState = valid[0].intent;

  // ---- 5. EXIT current state ----
  if (currentState?.onExit) {
    currentState.onExit();
  }

  // ---- 6. ENTER new state ----
  currentState = nextState;
  stateEnteredAt = Date.now();

  if (currentState.onEnter) {
    return currentState.onEnter();
  }

  return typeof currentState.response === 'function' ? currentState.response() : currentState.response;
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

export async function handleMessage(input) {
  return await getResponse(input);
}
