import { AssistantAgent } from "./agent/AssistantAgent";
import { fileSystemTool } from "./tools/filesystem";
import { fileSearchTool } from "./tools/fileSearchTool";
import { bashExecutorTool } from "./tools/BashTool";
import readline from "readline";

// Définir les outils avec des descriptions plus claires
const tools = [
  {
    type: "function",
    function: {
      name: "fileSystemTool",
      description:
        "Tool for file system operations: read files, list directories",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["read", "listDirectories"],
            description:
              "Operation to perform: 'read' to read files, 'listDirectories' to list directory contents",
          },
          filePath: {
            type: "string",
            description: "Absolute file path to read or directory to list",
          },
        },
        required: ["operation", "filePath"],
      },
      function: fileSystemTool,
    },
  },
  {
    type: "function",
    function: {
      name: "fileSearchTool",
      description:
        "Tool for searching files by name or content, and exploring project structure",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["find", "grep", "exploreProject"],
            description:
              "Operation to perform: 'find' to find files by name, 'grep' to search in file contents, 'exploreProject' to explore project structure",
          },
          directory: {
            type: "string",
            description: "Directory to search in",
          },
          pattern: {
            type: "string",
            description: "Pattern to search for (file name or text content)",
          },
          recursive: {
            type: "boolean",
            description: "Whether to search recursively in subdirectories",
          },
        },
        required: ["operation", "directory"],
      },
      function: fileSearchTool,
    },
  },
  {
    type: "function",
    function: {
      name: "bashExecutorTool",
      description: "Tool for executing bash commands",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Bash command to execute",
          },
        },
        required: ["command"],
      },
      function: bashExecutorTool,
    },
  },
];
// Configuration pour fonctionner avec OpenAI et Ollama
const llm_config = {
  api_type: "ollama", // Options: "openai" ou "ollama"
  model: "phi4-mini:latest", // Pour Ollama: "llama3.2", pour OpenAI: "gpt-4o-mini", etc.
  baseURL: "http://vm-aidalinfo-ai:11434/v1", // URL de l'API Ollama
  api_key: process.env.OPENAI_API_KEY ?? "",
};
// const llm_config = {
//   api_type: "openai",
//   model: "gpt-4o",
//   api_key: process.env.OPENAI_API_KEY,
// };

const systemPrompt = `You are an expert software development assistant. Your task is to help developers understand and work with codebases using a precise step-by-step approach. FOLLOW THESE INSTRUCTIONS EXACTLY.

EXTREMELY IMPORTANT: You MUST use the exact JSON format shown below when using tools. DO NOT modify the format or add text before or after the JSON.

AVAILABLE TOOLS - YOU MUST USE THESE EXACT JSON FORMATS:

1. fileSystemTool - For files and directories:
   CORRECT: { "operation": "read", "filePath": "/absolute/path/to/file" }
   CORRECT: { "operation": "listDirectories", "filePath": "/absolute/path/to/directory" }
   
   INCORRECT: "fileSystemTool.read('/path')" or "Using fileSystemTool to read..."
   
   EXAMPLE CORRECT USAGE:
   { "operation": "read", "filePath": "/home/user/project/src/index.js" }

2. fileSearchTool - For searching:
   CORRECT: { "operation": "find", "directory": "/absolute/path", "pattern": "name", "recursive": true }
   CORRECT: { "operation": "grep", "directory": "/absolute/path", "pattern": "text", "recursive": true }
   CORRECT: { "operation": "exploreProject", "directory": "/absolute/path/to/project" }
   
   INCORRECT: "fileSearchTool.grep(...)" or "I'll use fileSearchTool to search..."
   
   EXAMPLE CORRECT USAGE:
   { "operation": "grep", "directory": "/home/user/project", "pattern": "function main", "recursive": true }

3. bashExecutorTool - For commands:
   CORRECT: { "command": "your bash command" }
   
   INCORRECT: "bashExecutorTool.execute('ls')" or "Running bash command..."
   
   EXAMPLE CORRECT USAGE:
   { "command": "ls -la /home/user/project" }

CRITICAL: NEVER write sentences or text around the tool calls. ONLY use the exact JSON format shown above.
CRITICAL: NEVER use keywords like 'function', 'call', 'using', or 'executing' before your JSON.

PATH RULES - FOLLOW THESE EXACTLY:
- DEFAULT PATH: Always use current directory if no path provided
- GET CURRENT PATH: { "command": "pwd" }
- PROJECT REFERENCES: When user says "this project" or "codebase", use current directory
- RELATIVE PATHS: Resolve "./src" or "../lib" from current directory

PROJECT EXPLORATION - FOLLOW THIS SEQUENCE:
1. START WITH: { "operation": "exploreProject", "directory": "$(pwd)" }
2. FIND CONFIG FILES: { "operation": "find", "directory": "$(pwd)", "pattern": "package.json|tsconfig.json", "recursive": true }
3. READ README: { "operation": "find", "directory": "$(pwd)", "pattern": "README.md", "recursive": false }
4. CHECK LANGUAGE: Look for .js/.ts/.py/.go extensions
5. EXAMINE STRUCTURE: Identify src/, lib/, tests/, docs/ directories

KEY FILE PATTERNS TO SEARCH FOR:
- NODE.JS: 
  - ROUTES: { "operation": "grep", "directory": "$(pwd)", "pattern": "router\\.|app\\.get\\(|app\\.post\\(", "recursive": true }
  - MIDDLEWARE: { "operation": "grep", "directory": "$(pwd)", "pattern": "app\\.use\\(|next\\)", "recursive": true }
  - MODELS: { "operation": "grep", "directory": "$(pwd)", "pattern": "mongoose\\.model|Schema", "recursive": true }

- REACT:
  - COMPONENTS: { "operation": "grep", "directory": "$(pwd)", "pattern": "function.*\\(\\)|React\\.Component", "recursive": true }
  - HOOKS: { "operation": "grep", "directory": "$(pwd)", "pattern": "useState|useEffect", "recursive": true }

- VUE:
  - COMPONENTS: { "operation": "grep", "directory": "$(pwd)", "pattern": "defineComponent|Vue\\.component", "recursive": true }

- TYPESCRIPT:
  - INTERFACES: { "operation": "grep", "directory": "$(pwd)", "pattern": "interface|type.*=", "recursive": true }
  - CLASSES: { "operation": "grep", "directory": "$(pwd)", "pattern": "class.*\\{", "recursive": true }

GIT COMMIT WORKFLOW - FOLLOW THIS EXACT SEQUENCE:
WHEN user asks to commit changes, DO THESE STEPS IN ORDER:
1. RUN: { "command": "git status" }
2. RUN: { "command": "git diff" }
3. RUN: { "command": "git diff --staged" }
4. ANALYZE changes:
   - LIST modified files
   - UNDERSTAND changes (new features, fixes)
   - DETERMINE purpose
5. DRAFT commit message in format: type: description
   - USE types: feat, fix, docs, style, refactor, test, chore
6. RUN: { "command": "git add ." }
7. RUN: { "command": "git commit -m \"Your message\"" }
8. ONLY IF REQUESTED, RUN: { "command": "git push" }

COMMIT TRIGGER PHRASES - EXECUTE GIT WORKFLOW WHEN USER SAYS ANY OF THESE:
- "commit the changes" / "commit ces changements"
- "commit these modifications" / "commit ces modifications"
- "make a commit" / "faire un commit"
- "create a commit" / "créer un commit"
- "commit to github/gitlab" / "commit sur github/gitlab"
- "analyze and commit" / "analyser et commit"
- "check modifications and commit" / "vérifier les modifications et commit"
- "add a commit message for these changes" / "ajouter un message de commit pour ces changements"
- "pourquoi tu ne fais pas le commit" / "why don't you make the commit"
- "pourrais-tu faire un commit" / "could you make a commit"
- "ajoute un commit" / "add a commit"
- "effectue un commit" / "perform a commit"
- "fais un commit" / "do a commit"

COMMON BASH COMMANDS - USE THESE FORMATS:
- LIST FILES: { "command": "ls -la" }
- SEARCH IN FILES: { "command": "grep -r \"string\" --include=\"*.js\" ." }
- GET FILE TREE: { "command": "find . -type f | grep -v \"node_modules\" | sort" }
- RUN TESTS: { "command": "npm test" } or { "command": "yarn test" }
- START APP: { "command": "npm start" } or { "command": "yarn start" }

ANSWER QUESTIONS ABOUT CODE - FOLLOW THIS PROCESS:
1. SEARCH relevant files using grep/find
2. READ key files completely
3. FOCUS on specific code sections 
4. EXPLAIN with specific examples from the code
5. BE CONCISE and direct in explanations

FEATURE QUESTIONS:
1. SEARCH: { "operation": "grep", "directory": "$(pwd)", "pattern": "feature_name", "recursive": true }
2. READ files that appear in search results
3. TRACE execution flow and dependencies
4. EXPLAIN how feature works with code examples

ARCHITECTURE QUESTIONS:
1. EXAMINE project structure with { "operation": "exploreProject", "directory": "$(pwd)" }
2. IDENTIFY architectural pattern (MVC, microservices)
3. EXPLAIN code organization and data flow
4. SHOW key directories and responsibility areas

CONFIGURATION QUESTIONS:
1. FIND config files: { "operation": "find", "directory": "$(pwd)", "pattern": "config|.env", "recursive": true }
2. READ each relevant config file
3. EXPLAIN parameters and their impact
4. SHOW how to modify configuration

REMEMBER:
- ALWAYS check actual code before answering
- CITE specific file paths and code snippets
- FOCUS on being accurate and concise
- STRUCTURE your answers step by step
- USE code examples from the actual codebase

CRITICAL REMINDER: When using tools, output ONLY the exact JSON format as specified above. Do not add ANY text before or after the JSON.`;

// Créer un agent avec le prompt système en anglais
const agent = new AssistantAgent(
  "dev_assistant",
  systemPrompt,
  "You are a software development assistant, be precise and factual in your responses.",
  llm_config,
  tools,
  "ALWAYS" // Mode d'entrée humaine: toujours demander la prochaine question
);

// Interface CLI améliorée
console.log("=".repeat(80));
console.log(" AI DEV ASSISTANT ".padStart(45, "=").padEnd(80, "="));
console.log("=".repeat(80));
console.log(
  "\nWelcome to AI Dev Assistant! Ask me anything about your codebase."
);
console.log("Type 'exit' or 'quit' to end the session.\n");

// Configuration pour éviter les problèmes d'écho
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false, // Désactiver le mode terminal pour éviter l'écho
});

// Obtenir et afficher le répertoire de travail actuel
const getCurrentDirectory = async () => {
  return new Promise((resolve) => {
    require("child_process").exec("pwd", (error, stdout) => {
      if (error) {
        resolve("/unknown");
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

// Fonction pour demander à l'utilisateur
async function askQuestion() {
  const currentDir = await getCurrentDirectory();
  rl.question(`\x1b[36m${currentDir}\x1b[0m > `, async (input) => {
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      console.log("\nThank you for using AI Dev Assistant. Goodbye!");
      rl.close();
      process.exit(0);
    } else if (input.toLowerCase() === "cd") {
      console.log("To change directory, use: cd <path>");
      askQuestion();
    } else if (input.toLowerCase().startsWith("cd ")) {
      const newDir = input.substring(3).trim();
      try {
        process.chdir(newDir);
        console.log(`Changed directory to: ${await getCurrentDirectory()}`);
      } catch (error) {
        console.error(`Error changing directory: ${error.message}`);
      }
      askQuestion();
    } else if (input.trim() === "") {
      // Ignorer les entrées vides
      askQuestion();
    } else {
      try {
        // Afficher un indicateur de chargement minimal
        process.stdout.write("\x1b[90m⏳ Processing...\x1b[0m\n\n");

        // Informations contextuelles sur le répertoire actuel
        const contextMessage = `Current working directory: ${await getCurrentDirectory()}`;

        // Ajouter le contexte à la question
        const contextualizedInput = `${contextMessage}\n\n${input}`;

        await agent.run(contextualizedInput);
        askQuestion();
      } catch (error) {
        console.error("\x1b[31mError:\x1b[0m", error);
        askQuestion();
      }
    }
  });
}

// Démarrer la CLI
console.log("Starting AI Dev Assistant in current directory...");
askQuestion();
