import readline from "readline";
import { intents } from "./intents.js";
import { getEmbedding } from "./fixed_calculations/embedder.js";
import { cosineSimilarity } from "./fixed_calculations/similarity.js";
import fs from "fs";
let lastIntent = null;
let currentState = null;
let stateEnteredAt = null;

async function prepareIntentEmbeddings() {
  for (const intent of intents) {
    intent.vectors = [];
    for (const example of intent.examples) {
      const vector = await getEmbedding(example);
      intent.vectors.push(vector);
    }
  }
}

const sessions = new Map();
const STATE_TTL_MS = 30_000;

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      currentState: null,
      stateEnteredAt: null
    });
  }
  return sessions.get(sessionId);
}


export async function getResponse(sessionId, message) {
  await prepareIntentEmbeddings();
  const session = getSession(sessionId);

  // ---- 0. State decay ----

  if (
    session.currentState &&
    Date.now() - session.stateEnteredAt > STATE_TTL_MS
  ) {
    if (session.currentState.onExit) {
      session.currentState.onExit();
    }
    session.currentState = null;
    session.stateEnteredAt = null;
  }

  const inputVector = await getEmbedding(message);

  // ---- 1. Score all intents ----
  const scored = intents.map(intent => {
    let best = 0;
    for (const vector of intent.vectors) {
      best = Math.max(
        best,
        cosineSimilarity(inputVector, vector)
      );
    }
    return { intent, score: best };
  });

  // ---- 2. Confidence filter ----
  const confident = scored.filter(s => s.score >= 0.65);
  if (confident.length === 0) {
    return { reply: "Sorry, I don't understand yet(confident).", state: session.currentState?.name ?? "IDLE" };
  }

  // ---- 3. Transition filter ----
  const valid = confident.filter(({ intent }) => {
    if (!intent.allowedPreviousIntents) return true;
    return intent.allowedPreviousIntents.includes(session.currentState?.name);
  });

  if (valid.length === 0) {
    return { reply: "Sorry, I don't understand yet(valid).", state: session.currentState?.name ?? "IDLE" };
  }

  // ---- 4. Pick best valid intent ----
  valid.sort((a, b) => b.score - a.score);
  const nextState = valid[0].intent;

  // ---- 5. Exit old state ----
  if (session.currentState?.onExit) {
    session.currentState.onExit();
  }

  // ---- 6. Enter new state ----
  session.currentState = nextState;
  session.stateEnteredAt = Date.now();

  const reply = nextState.onEnter ? nextState.onEnter() : "";

  return {
    reply,
    state: session.currentState.name
  };
}




  

// CLI
// (async () => {
//   await prepareIntentEmbeddings();




//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
//   });

//   console.log("🤖 Bot ready. Type something.");

//   rl.on("line", async (input) => {
//     const reply = await getResponse('1', input);
//     console.log("Bot:", reply);
//   });
// })();

export async function handleMessage(input) {
  return await getResponse(input);
}
