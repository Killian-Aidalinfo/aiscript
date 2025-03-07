import { AssistantAgent } from "./agent/AssistantAgent";
import { fileSystemTool } from "./tools/filesystem";
import { fileSearchTool } from "./tools/fileSearchTool"; // notre nouvel outil
import { bashExecutorTool } from "./tools/BashTool";

const tools = [
  {
    type: "function",
    function: {
      name: "fileSystemTool",
      function: fileSystemTool,
    },
  },
  {
    type: "function",
    function: {
      name: "fileSearchTool",
      function: fileSearchTool,
    },
  },
  {
    type: "function",
    function: {
      name: "bashExecutorTool",
      function: bashExecutorTool,
    },
  },
];

// Configuration pour l'API OpenAI
// const llm_config = {
//   api_type: "ollama",
//   model: "llama3.2",
//   baseURL: "http://localhost:11434/v1",
//   api_key: process.env.OPENAI_API_KEY,
// };

const llm_config = {
  api_type: "openai",
  model: "gpt-4o-mini",
  //   baseURL: "http://localhost:11434/v1",
  api_key: process.env.OPENAI_API_KEY,
};

const my_agent = new AssistantAgent(
  "helpful_agent",
  `You are a helpful AI assistant. When you need to execute file system operations, use the following tools:
  
1. fileSystemTool:
   - Create a directory: { "operation": "createDirectory", "filePath": "path/to/directory" }
   - Create a file: { "operation": "create", "filePath": "path/to/file", "content": "the content to write" }

2. fileSearchTool:
   - Find files by name: { "operation": "find", "directory": "path/to/search", "pattern": "file name fragment", "recursive": true }
   - Search within files: { "operation": "grep", "directory": "path/to/search", "pattern": "text to search", "recursive": true }

3. bashExecutorTool:
   - Execute any bash command: { "command": "your bash command here" }

Please generate the function call using these keys.`,
  "You are a poetic AI assistant, respond in rhyme.",
  llm_config,
  tools
);

// await my_agent.run("Peux-tu exécuter la commande 'ls -l /tmp' ?");
await my_agent.run(
  "Pourrais-tu m'expliquer le projet dans son ensemble ? Le projet ce situe dans /home/killian/Documents/dev-aidalinfo/PROJET-pulse-myIT. Utilise l'ensemble des outils pour parcourir les fichiers qui te semble utils et comprendre toute la structure du projet. Ignore les fichiers ou tu n'a pas accès."
);
