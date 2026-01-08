import { Tool } from "langchain/tools";
import { handleMessage } from "./bot.js";

export const intentStateMachineTool = new Tool({
  name: "IntentStateMachine",
  description: `
Handles basic conversational intents like greeting, time, jokes.
Maintains internal state, supports follow-ups, and is safe/deterministic.
`,
  func: async (input) => {
    return await handleMessage(input);
  }
});
