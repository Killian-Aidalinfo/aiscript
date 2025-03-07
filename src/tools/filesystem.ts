// file: fileSystemTool.ts
import fs from "fs/promises";
import path from "path";
import process from "process";

export async function fileSystemTool(args: any): Promise<string> {
  // Parsing si args est une chaîne
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (error: any) {
      return `Erreur de parsing des arguments: ${error.message}`;
    }
  }

  let { operation, filePath, content } = args;

  // Normalisation du chemin : si filePath contient le placeholder, le remplacer
  if (
    filePath &&
    typeof filePath === "string" &&
    filePath.includes("<current working directory>")
  ) {
    filePath = filePath.replace("<current working directory>", process.cwd());
  }
  if (filePath && typeof filePath === "string") {
    filePath = path.resolve(filePath);
  }

  try {
    if (operation === "read") {
      const data = await fs.readFile(filePath, "utf8");
      return `Contenu du fichier : ${data}`;
    } else if (operation === "create") {
      await fs.writeFile(filePath, content || "", "utf8");
      return `Fichier ${filePath} créé.`;
    } else if (operation === "update") {
      await fs.writeFile(filePath, content || "", "utf8");
      return `Fichier ${filePath} mis à jour.`;
    } else if (operation === "delete") {
      await fs.unlink(filePath);
      return `Fichier ${filePath} supprimé.`;
    } else if (operation === "createDirectory") {
      await fs.mkdir(filePath, { recursive: true });
      return `Dossier ${filePath} créé.`;
    } else if (operation === "deleteDirectory") {
      await fs.rm(filePath, { recursive: true, force: true });
      return `Dossier ${filePath} supprimé.`;
    } else if (operation === "listDirectories") {
      // Lister uniquement les répertoires dans le dossier indiqué
      const entries = await fs.readdir(filePath, { withFileTypes: true });
      const directories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      return `Répertoires dans ${filePath} : ${directories.join(", ")}`;
    } else {
      return "Opération invalide.";
    }
  } catch (error: any) {
    return `Erreur lors de l'opération "${operation}" sur ${filePath} : ${error.message}`;
  }
}
