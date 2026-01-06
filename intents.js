export const intents = [
    {
      name: "greeting",
      examples: ["hi", "hello", "hey"],
      response: "Hello 👋"
    },
    {
      name: "how_are_you",
      examples: ["how are you", "how are you doing", "how r u"],
      response: "I'm doing well 🙂"
    },
    {
      name: "time",
      examples: ["what is the time", "current time", "time now"],
      response: () => new Date().toLocaleTimeString()
    },
    {
      name: "joke",
      examples: [
        "tell me a joke",
        "say something funny",
        "make me laugh"
      ],
      response: "😄 Why did the developer go broke? Because he used up all his cache."
    }
  ];
  