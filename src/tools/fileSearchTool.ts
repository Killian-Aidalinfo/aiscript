// file: fileSearchTool.ts
import fs from "fs/promises";
import path from "path";
import process from "process";

// Liste des dossiers à ignorer par défaut
const DEFAULT_IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache",
  ".vscode",
  ".idea",
];

// Liste des fichiers importants pour l'analyse
const KEY_PROJECT_FILES = [
  "README.md",
  "package.json",
  "tsconfig.json",
  "webpack.config.js",
  "vite.config.js",
  ".env.example",
  "docker-compose.yml",
  "Dockerfile",
  "requirements.txt",
  "setup.py",
  "pom.xml",
  "build.gradle",
  "go.mod",
  "Cargo.toml",
  "composer.json",
  "Gemfile",
];

// Extensions de fichiers par catégorie
const FILE_CATEGORIES: Record<string, string[]> = {
  javascript: [".js", ".jsx", ".ts", ".tsx"],
  python: [".py", ".pyx", ".ipynb"],
  web: [".html", ".css", ".scss", ".sass"],
  config: [".json", ".yaml", ".yml", ".toml", ".ini", ".conf"],
  documentation: [".md", ".txt", ".rst", ".adoc"],
  data: [".csv", ".xml", ".sql"],
  misc: [".sh", ".bat", ".ps1", ".rb", ".php", ".go", ".java", ".kt", ".rs", ".c", ".cpp", ".h", ".hpp"],
};

interface SearchArgs {
  operation: "find" | "grep" | "exploreProject";
  directory: string;
  pattern?: string;
  recursive?: boolean;
  ignoreDirs?: string[];
  maxResults?: number;
}

// Détecte le langage principal en fonction des extensions de fichiers
function detectMainLanguage(files: string[]): string[] {
  const extensionCount: Record<string, number> = {};
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext) {
      extensionCount[ext] = (extensionCount[ext] || 0) + 1;
    }
  }
  
  // Classement des langages par nombre de fichiers
  const languageCounts: Record<string, number> = {};
  
  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    languageCounts[category] = extensions.reduce((count, ext) => {
      return count + (extensionCount[ext] || 0);
    }, 0);
  }
  
  // Trier les langages par comptage décroissant
  return Object.entries(languageCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

// Détecte les frameworks à partir des fichiers de configuration
function detectFrameworks(files: string[]): string[] {
  const frameworks: string[] = [];
  
  // Mapping des fichiers indicateurs aux frameworks
  const frameworkIndicators: Record<string, string[]> = {
    "package.json": ["react", "vue", "angular", "next", "express", "nestjs", "koa"],
    "vite.config.js": ["vue", "react"],
    "next.config.js": ["nextjs"],
    "angular.json": ["angular"],
    "nuxt.config.js": ["nuxt"],
    "django": ["django"],
    "requirements.txt": ["flask", "django", "fastapi"],
    "pom.xml": ["spring"],
    "build.gradle": ["spring", "android"],
    "go.mod": ["gin", "echo"],
    "composer.json": ["laravel", "symfony"],
    "Gemfile": ["rails"],
  };
  
  // Chercher les fichiers indicateurs
  for (const file of files) {
    const basename = path.basename(file);
    const dirname = path.basename(path.dirname(file));
    
    for (const [indicator, possibleFrameworks] of Object.entries(frameworkIndicators)) {
      if (basename === indicator || dirname === indicator) {
        frameworks.push(...possibleFrameworks);
      }
    }
  }
  
  // Éliminer les doublons
  return [...new Set(frameworks)];
}

async function traverseDirectory(
  currentDir: string,
  recursive: boolean,
  fileCallback: (filePath: string) => Promise<void>,
  shouldIgnore?: (entry: fs.Dirent, fullPath: string) => boolean
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
    
    // Vérifier si le répertoire/fichier doit être ignoré
    if (shouldIgnore && shouldIgnore(entry, fullPath)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      if (recursive) {
        await traverseDirectory(fullPath, recursive, fileCallback, shouldIgnore);
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
  const { operation, directory } = args;
  let { pattern, recursive, ignoreDirs, maxResults } = args;
  
  // Valeurs par défaut
  recursive = recursive !== false; // True par défaut
  ignoreDirs = ignoreDirs || DEFAULT_IGNORE_DIRS;
  maxResults = maxResults || 1000; // Limite le nombre de résultats

  const validOperations = ["find", "grep", "exploreProject"];
  if (!operation || typeof operation !== "string" || !validOperations.includes(operation)) {
    return `Erreur: La clé 'operation' est requise et doit être l'une des valeurs suivantes: ${validOperations.join(", ")}.`;
  }
  
  if (!directory || typeof directory !== "string") {
    return "Erreur: La clé 'directory' est requise et doit être une chaîne.";
  }
  
  if (operation !== "exploreProject" && (!pattern || typeof pattern !== "string" || pattern.trim() === "")) {
    return "Erreur: La clé 'pattern' est requise pour les opérations 'find' et 'grep' et doit être une chaîne non vide.";
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

  // Fonction d'ignore standard
  const standardIgnore = (entry: fs.Dirent, fullPath: string): boolean => {
    if (entry.isDirectory()) {
      const dirName = entry.name;
      return ignoreDirs.includes(dirName);
    }
    return false;
  };

  if (operation === "find") {
    // Pour "find", on cherche dans le nom des fichiers
    const lowerPattern = pattern.toLowerCase();
    let results: string[] = [];
    
    await traverseDirectory(
      dirPath,
      recursive,
      async (filePath) => {
        const fileName = path.basename(filePath).toLowerCase();
        if (fileName.includes(lowerPattern)) {
          results.push(filePath);
          if (results.length >= maxResults) {
            return; // Arrêter après avoir atteint maxResults
          }
        }
      },
      standardIgnore
    );
    
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
    const lowerPattern = pattern.toLowerCase();
    let results: string[] = [];
    
    await traverseDirectory(
      dirPath,
      recursive,
      async (filePath) => {
        try {
          const content = await fs.readFile(filePath, "utf8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes(lowerPattern)) {
              results.push(`${filePath} [ligne ${i + 1}]: ${line}`);
              if (results.length >= maxResults) {
                return; // Arrêter après avoir atteint maxResults
              }
            }
          }
        } catch (err) {
          // Ignorer les erreurs de lecture pour ce fichier
        }
      },
      standardIgnore
    );
    
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
  } else if (operation === "exploreProject") {
    // Nouvelle fonctionnalité d'exploration de projet
    const structure: Record<string, any> = {
      rootDirectory: dirPath,
      keyFiles: {},
      fileCount: 0,
      directoryCount: 0,
      extensions: {},
    };

    const allFiles: string[] = [];
    const directoryTree: Record<string, any> = {};
    
    // Fonction récursive pour construire l'arborescence
    function addToDirectoryTree(filePath: string) {
      const relativePath = path.relative(dirPath, filePath);
      const parts = relativePath.split(path.sep);
      
      let current = directoryTree;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
          structure.directoryCount++;
        }
        current = current[part];
      }
      
      // Ajouter le fichier
      const fileName = parts[parts.length - 1];
      current[fileName] = null;
      structure.fileCount++;
      
      // Ajouter aux statistiques d'extension
      const ext = path.extname(fileName).toLowerCase();
      if (ext) {
        structure.extensions[ext] = (structure.extensions[ext] || 0) + 1;
      }
    }
    
    // Chercher tous les fichiers, construire la structure
    await traverseDirectory(
      dirPath,
      true, // Toujours récursif pour l'exploration de projet
      async (fullPath) => {
        allFiles.push(fullPath);
        addToDirectoryTree(fullPath);
      },
      standardIgnore
    );

    // Identifier et lire les fichiers clés du projet
    const projectKeyFiles: Record<string, any> = {};
    for (const keyFile of KEY_PROJECT_FILES) {
      const matchingFiles = allFiles.filter(file => 
        path.basename(file) === keyFile || 
        path.basename(file).toLowerCase() === keyFile.toLowerCase()
      );
      
      if (matchingFiles.length > 0) {
        try {
          // Lire le contenu des fichiers clés
          const content = await fs.readFile(matchingFiles[0], 'utf8');
          projectKeyFiles[keyFile] = {
            path: matchingFiles[0],
            content: content.length > 5000 ? content.substring(0, 5000) + "..." : content
          };
        } catch (error) {
          projectKeyFiles[keyFile] = {
            path: matchingFiles[0],
            error: "Impossible de lire le fichier"
          };
        }
      }
    }
    structure.keyFiles = projectKeyFiles;

    // Analyser les langages et frameworks
    structure.languages = detectMainLanguage(allFiles);
    structure.frameworks = detectFrameworks(allFiles);
    
    // Résultat condensé de l'arborescence (limité pour éviter une sortie trop grande)
    function summarizeTree(tree: Record<string, any>, maxDepth: number = 2, currentDepth: number = 0): any {
      if (currentDepth >= maxDepth) {
        const fileCount = Object.keys(tree).length;
        return fileCount > 0 ? `${fileCount} fichiers/répertoires` : {};
      }
      
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(tree)) {
        if (value === null) {
          result[key] = null;
        } else {
          result[key] = summarizeTree(value, maxDepth, currentDepth + 1);
        }
      }
      return result;
    }
    
    // Limiter la taille de la réponse
    structure.directoryStructure = summarizeTree(directoryTree);
    
    // Générer un résumé textuel du projet
    const summary = [
      `Projet situé à: ${dirPath}`,
      `Nombre de fichiers: ${structure.fileCount}`,
      `Nombre de répertoires: ${structure.directoryCount}`,
      `Langages principaux: ${structure.languages.join(", ")}`,
      `Frameworks potentiels: ${structure.frameworks.length > 0 ? structure.frameworks.join(", ") : "Non détectés"}`,
      `Fichiers clés trouvés: ${Object.keys(structure.keyFiles).join(", ")}`
    ].join("\n");
    
    structure.summary = summary;

    return JSON.stringify(structure, null, 2);
  } else {
    return "Opération invalide. Utilisez 'find', 'grep', ou 'exploreProject'.";
  }
}