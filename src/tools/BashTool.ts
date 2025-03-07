// file: bashExecutorTool.ts
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function bashExecutorTool(args: any): Promise<string> {
  // Parsing si args est une chaîne
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (error: any) {
      return `Erreur de parsing des arguments: ${error.message}`;
    }
  }

  if (!args.command || typeof args.command !== "string") {
    return "Erreur: La clé 'command' est requise et doit être une chaîne.";
  }

  const command = args.command;

  try {
    // Augmenter la taille maximale du buffer à 10 Mo par exemple
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 100 * 1024 * 1024,
    });
    return JSON.stringify({ stdout, stderr }, null, 2);
  } catch (error: any) {
    return `Erreur lors de l'exécution de la commande "${command}": ${error.message}`;
  }
}
