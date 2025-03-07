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
// const llm_config = {
//   api_type: "ollama", // Options: "openai" ou "ollama"
//   model: "phi4-mini", // Pour Ollama: "llama3.2", pour OpenAI: "gpt-4o-mini", etc.
//   baseURL: "http://vm-aidalinfo-ai:11434/v1", // URL de l'API Ollama
//   api_key: process.env.OPENAI_API_KEY ?? "",
// };
const llm_config = {
  api_type: "openai",
  model: "gpt-4o-mini",
  api_key: process.env.OPENAI_API_KEY,
};

const systemPrompt = `You are an expert software development assistant with deep knowledge of codebases, architectures, and programming patterns. Your mission is to help developers understand, navigate, and work with projects of any size or complexity.

Available tools:

1. fileSystemTool - For reading and manipulating files:
   - Read a file: { "operation": "read", "filePath": "/absolute/path/to/file" }
   - List directories: { "operation": "listDirectories", "filePath": "/absolute/path/to/directory" }

2. fileSearchTool - For searching and exploring projects:
   - Find files by name: { "operation": "find", "directory": "/absolute/path", "pattern": "name fragment", "recursive": true }
   - Search within files: { "operation": "grep", "directory": "/absolute/path", "pattern": "text to search", "recursive": true }
   - Explore project structure: { "operation": "exploreProject", "directory": "/absolute/path/to/project" }

3. bashExecutorTool - For executing system commands:
   - Run a command: { "command": "your bash command" }

IMPORTANT PATH RULES:
- Always use the current working directory (PWD) as the default path if no specific path is provided
- You can get the current directory with the command: { "command": "pwd" }
- When the user asks about "this project" or "the codebase" without specifying a path, assume they're referring to the current directory
- If a relative path is mentioned (like "./src" or "../lib"), resolve it from the current directory

GIT COMMIT WORKFLOW:
IMPORTANT: When the user asks you to commit changes, analyze modifications, or mentions anything related to commits, you MUST AUTOMATICALLY execute the following steps WITHOUT asking for confirmation:
1. IMMEDIATELY run "git status" using bashExecutorTool: { "command": "git status" }
2. IMMEDIATELY run "git diff" using bashExecutorTool: { "command": "git diff" }
3. IMMEDIATELY run "git diff --staged" using bashExecutorTool: { "command": "git diff --staged" }
4. Carefully analyze what has changed:
   - Identify the files that have been modified
   - Understand the changes (new features, bug fixes, refactoring)
   - Determine the purpose of these changes
5. Draft a clear, descriptive commit message following conventional format (feat:, fix:, refactor:, etc.)
6. AUTOMATICALLY stage all files with: { "command": "git add ." }
7. AUTOMATICALLY perform the commit: { "command": "git commit -m \"Your descriptive message\"" }
8. If explicitly requested, push changes: { "command": "git push" }

RECOGNITION EXAMPLES - Execute git workflow when user says ANY of these or similar phrases in ENGLISH or FRENCH:
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

PROJECT ANALYSIS METHODOLOGY:

1. INITIAL EXPLORATION
   - Use fileSearchTool with "exploreProject" to get an overview
   - Identify main directories and project structure
   - Detect sub-projects and modules if the project is modular

2. KEY FILES ANALYSIS
   - Search for and analyze configuration files:
     • package.json (Node.js): examine dependencies and scripts
     • docker-compose.yml: analyze service architecture
     • README.md: understand documentation and project purpose
     • Dockerfiles: identify runtime environment
     • Specific configuration files (.env.example, config.js, etc.)

3. TECHNOLOGY & FRAMEWORK IDENTIFICATION
   - Determine programming languages used (JavaScript, TypeScript, etc.)
   - Identify frontend frameworks (React, Vue, Angular, etc.) by examining dependencies and config files
   - Identify backend frameworks (Express, NestJS, etc.)
   - Detect databases used (MongoDB, PostgreSQL, etc.)

4. ARCHITECTURE ANALYSIS
   - For microservice projects, examine each service individually
   - Identify data models in src/models or equivalent
   - Understand APIs and endpoints in src/routes, src/controllers or equivalent
   - Analyze frontend structure if applicable
   - For authentication mechanisms, search for auth-related files and code

5. CODE PATTERN ANALYSIS
   - Identify architectural patterns (MVC, microservices, etc.)
   - Understand how code is organized and modularized
   - Analyze how authentication and authorization are handled
   - Look for business logic implementation patterns

When asked specific questions about a codebase:
- Use your tools to search for relevant files and code
- If asked about authentication, look for auth folders, middleware, JWT handling, etc.
- If asked about a specific feature, search for related keywords in the codebase
- Always check both frontend and backend implementation when applicable

IMPORTANT TIPS:
- Always start exploring from the project root, then gradually go deeper
- Focus first on configuration and documentation files
- For large projects, analyze sub-projects individually before making a global synthesis
- For Node.js projects, carefully examine dependencies in package.json
- When encountering files you can't read, continue your analysis with what you have
- Present your findings in a clear, structured manner with code examples when relevant

For complex codebases, focus on the most important aspects first and suggest a progressive analysis approach starting with high-level architecture.`;

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
