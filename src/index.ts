import { AssistantAgent } from "./agent/AssistantAgent";
import { BashTool } from "./tools/BashTool";
import { GlobTool } from "./tools/GlobTool";
import { GrepTool } from "./tools/GrepTool";
import { LSTool } from "./tools/LSTool";
import { FileReadTool } from "./tools/FileReadTool";
import { FileEditTool } from "./tools/FileEditTool";
import { FileWriteTool } from "./tools/FileWriteTool";

// Create instances of our tools
const bashTool = new BashTool();
const globTool = new GlobTool();
const grepTool = new GrepTool();
const lsTool = new LSTool();
const fileReadTool = new FileReadTool();
const fileEditTool = new FileEditTool();
const fileWriteTool = new FileWriteTool();

const tools = [
  {
    type: "function",
    function: {
      name: "bashTool",
      function: (params: any) => bashTool.execute(params),
    },
  },
  {
    type: "function",
    function: {
      name: "globTool",
      function: (params: any) => globTool.execute(params),
    },
  },
  {
    type: "function",
    function: {
      name: "grepTool",
      function: (params: any) => grepTool.execute(params),
    },
  },
  {
    type: "function",
    function: {
      name: "lsTool",
      function: (params: any) => lsTool.execute(params),
    },
  },
  {
    type: "function",
    function: {
      name: "fileReadTool",
      function: (params: any) => fileReadTool.execute(params),
    },
  },
  {
    type: "function",
    function: {
      name: "fileEditTool",
      function: (params: any) => fileEditTool.execute(params),
    },
  },
  {
    type: "function",
    function: {
      name: "fileWriteTool",
      function: (params: any) => fileWriteTool.execute(params),
    },
  },
];

// Configuration pour l'API OpenAI
const llm_config = {
  api_type: "ollama",
  model: "llama3.2",
  baseURL: "http://localhost:11434/v1",
  api_key: process.env.OPENAI_API_KEY ?? "",
};

const my_agent = new AssistantAgent(
  "helpful_agent",
  `You are a helpful AI assistant. 
  Per default your are in current directory use pwd to know where you are.
  You have access to the following tools:
1. bashTool:
   - To execute shell commands: { "command": "your-shell-command", "timeout": 30000 }

2. globTool:
   - To find files using glob patterns: { "pattern": "**/*.js", "path": "/path/to/search" }

3. grepTool:
   - To search file contents: { "pattern": "search text", "path": "/path/to/search", "include": "*.ts" }

4. lsTool:
   - To list directory contents: { "path": "/path/to/directory", "ignore": ["node_modules", "*.log"] }

5. fileReadTool:
   - To read file contents: { "file_path": "/path/to/file.txt", "offset": 0, "limit": 2000 }

6. fileEditTool:
   - To edit files: { "file_path": "/path/to/file.txt", "old_string": "text to replace", "new_string": "replacement text" }

7. fileWriteTool:
   - To write files: { "file_path": "/path/to/file.txt", "content": "file content to write" }

Please generate the appropriate function calls using these tools.`,
  "You are a poetic AI assistant, respond in rhyme.",
  llm_config,
  tools
);

await my_agent.run(
  "Pourrais tu me créer un dossier nommé test avec dedans un fichier hello world.txt contenant du text en latin ramdom"
);
