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
    if (config.api_type === "openai") {
      return new OpenAI({
        apiKey: config.api_key,
      });
    }
    if (config.api_type === "ollama") {
      return new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.api_key,
      });
    }
  }

  async run(prompt: string) {
    const messages = [
      { role: "system", content: this.DEFAULT_PROMPT },
      { role: "user", content: prompt },
    ];

    let response = "";

    if (this.functions) {
      console.log("Running with tools...");
      const runner = this.wrapper.beta.chat.completions
        .runTools({
          model: this.llm_config.model,
          messages: messages,
          tools: this.functions, // passage de vos outils
        })
        .on("message", (message) => console.log("messages", message));
      const finalContent = await runner.finalContent();
      console.log();
      console.log("Final content:", finalContent);
      // console.log("Result: ", result);
      // // Convertir le résultat en chaîne si ce n'est pas déjà une chaîne
      // const resultStr =
      //   typeof result === "string" ? result : JSON.stringify(result);
      // process.stdout.write(resultStr);
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

    console.log("\nResponse completed.");

    if (response.toUpperCase().includes("TERMINATE")) {
      console.log("TERMINATE: Ending the session.");
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
