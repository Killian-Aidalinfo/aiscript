// file: fileSearchTool.ts
import fs from "fs/promises";
import path from "path";
import process from "process";

interface SearchArgs {
  operation: "find" | "grep";
  directory: string;
  pattern: string;
  recursive?: boolean;
}

async function traverseDirectory(
  currentDir: string,
  recursive: boolean,
  fileCallback: (filePath: string) => Promise<void>
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (err) {
    // On ignore les erreurs de lecture pour ce répertoire
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        await traverseDirectory(fullPath, recursive, fileCallback);
      }
    } else if (entry.isFile()) {
      await fileCallback(fullPath);
    }
  }
}

export async function fileSearchTool(args: any): Promise<string> {
  // Parsing si args est une chaîne
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (error: any) {
      return `Erreur de parsing des arguments: ${error.message}`;
    }
  }

  // Validation des clés requises et typage
  const { operation, directory, pattern } = args;
  let recursive: boolean = args.recursive === true;

  if (
    !operation ||
    typeof operation !== "string" ||
    !["find", "grep"].includes(operation)
  ) {
    return "Erreur: La clé 'operation' est requise et doit être 'find' ou 'grep'.";
  }
  if (!directory || typeof directory !== "string") {
    return "Erreur: La clé 'directory' est requise et doit être une chaîne.";
  }
  if (!pattern || typeof pattern !== "string" || pattern.trim() === "") {
    return "Erreur: La clé 'pattern' est requise et doit être une chaîne non vide.";
  }

  // Normalisation du répertoire
  let dirPath = directory;
  if (dirPath.includes("<current working directory>")) {
    dirPath = dirPath.replace("<current working directory>", process.cwd());
  }
  dirPath = path.resolve(dirPath);

  // Vérifier que le répertoire existe
  try {
    await fs.access(dirPath);
  } catch {
    return `Erreur: Le répertoire "${dirPath}" n'existe pas ou n'est pas accessible.`;
  }

  // Fonction de traitement pour chaque fichier
  const lowerPattern = pattern.toLowerCase();
  let results: string[] = [];

  if (operation === "find") {
    // Pour "find", on cherche dans le nom des fichiers
    await traverseDirectory(dirPath, recursive, async (filePath) => {
      const fileName = path.basename(filePath).toLowerCase();
      if (fileName.includes(lowerPattern)) {
        results.push(filePath);
      }
    });
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
    // Pour "grep", on recherche dans le contenu des fichiers
    await traverseDirectory(dirPath, recursive, async (filePath) => {
      try {
        const content = await fs.readFile(filePath, "utf8");
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(lowerPattern)) {
            results.push(`${filePath} [ligne ${index + 1}]: ${line}`);
          }
        });
      } catch (err) {
        // Ignorer les erreurs de lecture pour ce fichier
      }
    });
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
