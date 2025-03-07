import fs from "fs/promises";
import path from "path";
import process from "process";

export async function fileSystemTool(args: any): Promise<string> {
  // Si args est une chaîne, tenter de la parser
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (error: any) {
      return `Erreur de parsing des arguments: ${error.message}`;
    }
  }

  // Validation simple
  if (!args.operation || typeof args.operation !== "string") {
    return "Erreur: La clé 'operation' est obligatoire et doit être une chaîne de caractères.";
  }
  if (!args.filePath || typeof args.filePath !== "string") {
    return "Erreur: La clé 'filePath' est obligatoire et doit être une chaîne de caractères.";
  }

  // Normalisation du chemin
  let { operation, filePath, content } = args;
  if (filePath.includes("<current working directory>")) {
    filePath = filePath.replace("<current working directory>", process.cwd());
  }
  // Assurer un chemin absolu
  filePath = path.resolve(filePath);

  try {
    if (operation === "read") {
      const data = await fs.readFile(filePath, "utf8");
      return `Contenu du fichier : ${data}`;
    } else if (operation === "create") {
      // Vérifier si le chemin existe déjà et s'il s'agit d'un dossier
      try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          return `Erreur: "${filePath}" est un dossier, impossible de créer un fichier à cet emplacement.`;
        }
      } catch (e) {
        // Si le fichier n'existe pas, c'est OK
      }
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
    } else {
      return "Opération invalide.";
    }
  } catch (error: any) {
    return `Erreur lors de l'opération "${operation}" sur ${filePath} : ${error.message}`;
  }
}
