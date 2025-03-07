// file: fileSearchTool.ts
import fs from "fs/promises";
import path from "path";
import process from "process";

export async function fileSearchTool(args: any): Promise<string> {
  // Parsing si args est une chaîne
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (error: any) {
      return `Erreur de parsing des arguments: ${error.message}`;
    }
  }

  // Validation des clés requises
  const { operation, directory, pattern, recursive } = args;
  if (!operation || typeof operation !== "string") {
    return "Erreur: La clé 'operation' est requise et doit être une chaîne ('find' ou 'grep').";
  }
  if (!directory || typeof directory !== "string") {
    return "Erreur: La clé 'directory' est requise et doit être une chaîne.";
  }
  if (!pattern || typeof pattern !== "string") {
    return "Erreur: La clé 'pattern' est requise et doit être une chaîne.";
  }

  // Normalisation du répertoire
  let dirPath = directory;
  if (dirPath.includes("<current working directory>")) {
    dirPath = dirPath.replace("<current working directory>", process.cwd());
  }
  dirPath = path.resolve(dirPath);

  try {
    // Vérifier que le répertoire existe
    await fs.access(dirPath);
  } catch {
    return `Erreur: Le répertoire "${dirPath}" n'existe pas ou n'est pas accessible.`;
  }

  if (operation === "find") {
    let results: string[] = [];
    async function traverse(currentDir: string) {
      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch (err: any) {
        return;
      }
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (recursive) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
            results.push(fullPath);
          }
        }
      }
    }
    await traverse(dirPath);
    return JSON.stringify(
      {
        status: "success",
        operation: "find",
        directory: dirPath,
        files: results.length > 0 ? results : "Aucun fichier correspondant.",
      },
      null,
      2
    );
  } else if (operation === "grep") {
    let results: string[] = [];
    async function traverse(currentDir: string) {
      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch (err: any) {
        return;
      }
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (recursive) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          try {
            const content = await fs.readFile(fullPath, "utf8");
            const lines = content.split("\n");
            lines.forEach((line, index) => {
              if (line.toLowerCase().includes(pattern.toLowerCase())) {
                results.push(`${fullPath} [ligne ${index + 1}]: ${line}`);
              }
            });
          } catch (err: any) {
            // Ignorer les erreurs de lecture
          }
        }
      }
    }
    await traverse(dirPath);
    return JSON.stringify(
      {
        status: "success",
        operation: "grep",
        directory: dirPath,
        occurrences:
          results.length > 0 ? results : "Aucune occurrence trouvée.",
      },
      null,
      2
    );
  } else {
    return "Opération invalide. Utilisez 'find' ou 'grep'.";
  }
}
