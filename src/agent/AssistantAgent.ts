import OpenAI from "openai";
import readline from "readline";

class AssistantAgent {
  name: string;
  DEFAULT_PROMPT: string;
  description: string;
  llm_config: any;
  wrapper: any;
  functions: any; // propriété pour enregistrer les tools
  human_input_mode: string;
  rl: readline.Interface;

  constructor(
    name?: string,
    DEFAULT_PROMPT?: string,
    description?: string,
    llm_config?: any,
    functions?: any, // ajout du paramètre pour les tools
    human_input_mode: string = "ALWAYS"
  ) {
    this.name = name ?? "Assistant";
    this.DEFAULT_PROMPT =
      DEFAULT_PROMPT ??
      `
    You are a helpful AI assistant.
    Solve tasks using your coding and language skills.
    In the following cases, suggest javascript code (in a javascript coding block) or shell script (in a sh coding block) for the user to execute.
    1. When you need to collect info, use the code to output the info you need, for example, browse or search the web, download/read a file, print the content of a webpage or a file, get the current date/time, check the operating system. After sufficient info is printed and the task is ready to be solved based on your language skill, you can solve the task by yourself.
    2. When you need to perform some task with code, use the code to perform the task and output the result. Finish the task smartly.
    Solve the task step by step if you need to. If a plan is not provided, explain your plan first. Be clear which step uses code, and which step uses your language skill.
    When using code, you must indicate the script type in the code block. The user cannot provide any other feedback or perform any other action beyond executing the code you suggest. The user can't modify your code. So do not suggest incomplete code which requires users to modify.
    If you want the user to save the code in a file before executing it, put # filename: <filename> inside the code block as the first line. Don't include multiple code blocks in one response. Do not ask users to copy and paste the result. Instead, use 'print' function for the output when relevant. Check the execution result returned by the user.
    If the result indicates there is an error, fix the error and output the code again. Suggest the full code instead of partial code or code changes. If the error can't be fixed or if the task is not solved even after the code is executed successfully, analyze the problem, revisit your assumption, collect additional info you need, and think of a different approach to try.
    When you find an answer, verify the answer carefully. Include verifiable evidence in your response if possible.
    Reply "TERMINATE" in the end when everything is done.
    `;
    this.description =
      description ??
      "A helpful and general-purpose AI assistant that has strong language skills, Python skills, and Linux command line skills.";
    this.llm_config = llm_config;
    this.wrapper = this.setupWrapper(this.llm_config);
    this.functions = functions; // enregistrement des tools
    this.human_input_mode = human_input_mode;

    // Initialisation de readline pour l'entrée de l'utilisateur
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  setupWrapper(config: any) {
    if (config == null) {
      throw new Error("llm_config is required");
    }
    
    // Configuration pour OpenAI
    if (config.api_type === "openai") {
      console.log("Setting up OpenAI API client");
      return new OpenAI({
        apiKey: config.api_key,
      });
    }
    
    // Configuration pour Ollama
    if (config.api_type === "ollama") {
      console.log("Setting up Ollama API client with baseURL:", config.baseURL);
      return new OpenAI({
        baseURL: config.baseURL,
        apiKey: "sk-no-key-required",  // Ollama n'a pas besoin de clé API réelle
      });
    }
    
    throw new Error(`Unknown API type: ${config.api_type}`);
  }

  async run(prompt: string) {
    const messages = [
      { role: "system", content: this.DEFAULT_PROMPT },
      { role: "user", content: prompt },
    ];

    let response = "";

    if (this.functions) {
      // Configurer un gestionnaire d'événements personnalisé pour les messages
      console.log("Initializing AI with tools...");
      
      // Ajouter des instructions adaptées au moteur d'IA utilisé (OpenAI vs Ollama)
      const isOpenAI = this.llm_config.api_type === "openai";
      
      if (isOpenAI) {
        // Instructions spécifiques pour OpenAI qui a des restrictions sur les noms d'outils
        messages.push({
          role: "system",
          content: "IMPORTANT: When using tools, you must use ONLY the exact tool names as defined (fileSystemTool, fileSearchTool, or bashExecutorTool). Never add operations or methods to the tool name with dots."
        });
      }
      
      // Configuration commune pour les deux moteurs
      const runnerConfig = {
        model: this.llm_config.model,
        messages: messages,
        tools: this.functions,
      };
      
      // Ajouter baseURL pour Ollama si nécessaire
      if (this.llm_config.baseURL) {
        // @ts-ignore - Ignorer l'erreur de type car baseURL n'est pas dans les types officiels
        runnerConfig.baseURL = this.llm_config.baseURL;
      }
      
      const runner = this.wrapper.beta.chat.completions
        .runTools(runnerConfig)
        .on("message", (message: any) => {
          // Gérer spécifiquement les appels d'outils
          if (message.role === "assistant" && message.tool_calls && message.tool_calls.length > 0) {
            // Vérifier si l'appel d'outil est valide et afficher les informations
            try {
              const toolCall = message.tool_calls[0];
              const toolName = toolCall.function.name;
              
              // Vérifier si nous utilisons OpenAI et si le nom est valide
              const isOpenAI = this.llm_config.api_type === "openai";
              
              if (isOpenAI && (toolName.includes(".") || !/^[a-zA-Z0-9_-]+$/.test(toolName))) {
                console.log(`\x1b[31m⚠️ Invalid tool name: ${toolName}. OpenAI requires simple tool names without dots.\x1b[0m`);
                // Ne pas continuer l'affichage pour éviter la confusion avec OpenAI
                return;
              }
              
              // Extraire l'opération des arguments pour l'affichage
              let operation = "";
              try {
                const args = JSON.parse(toolCall.function.arguments);
                if (args.operation) {
                  operation = args.operation;
                }
              } catch (e) {
                // Ignorer les erreurs de parsing
              }
              
              // Afficher l'outil et l'opération
              const displayText = operation ? `${toolName} (${operation})` : toolName;
              console.log(`\x1b[33m🔧 Using tool: ${displayText}\x1b[0m`);
            } catch (e) {
              console.log(`\x1b[31m⚠️ Error processing tool call\x1b[0m`);
            }
          } else if (message.role === "tool") {
            // Pour les résultats d'outils, montrer seulement une indication discrète
            const toolId = message.tool_call_id;
            console.log(`\x1b[32m✓ Tool completed\x1b[0m`);
          }
          // Ne pas afficher les autres messages
        });
      
      // Obtenir le contenu final et l'afficher
      const finalContent = await runner.finalContent();
      
      // Afficher le contenu final sans préfixe
      process.stdout.write(finalContent);
      
      response = finalContent;
    } else {
      // Sinon, on utilise le flux standard
      const stream = await this.wrapper.chat.completions.create({
        model: this.llm_config.model,
        messages: messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        response += content;
        process.stdout.write(content);
      }
    }

    // Ne pas afficher "Response completed"
    
    if (response.toUpperCase().includes("TERMINATE")) {
      console.log("\n\x1b[36mTERMINATE: Ending the session.\x1b[0m");
      this.rl.close();
      return;
    }

    if (this.human_input_mode === "ALWAYS") {
      this.rl.question(
        "Please ask your next question (or type 'TERMINATE' to stop): ",
        (newPrompt) => {
          if (newPrompt.toUpperCase() === "TERMINATE") {
            console.log("TERMINATE: Ending the session.");
            this.rl.close();
          } else {
            this.run(newPrompt);
          }
        }
      );
    } else {
      this.rl.close();
    }
  }
}

export { AssistantAgent };
