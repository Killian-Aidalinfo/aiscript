// file: ProjectSummarizerTool.ts
import fs from "fs/promises";
import path from "path";
import { fileSystemTool } from "./filesystem";

interface ProjectSummarizerArgs {
  projectPath: string;
  maxDepth?: number;
  maxFilesToAnalyze?: number;
}

// Extensions de fichiers importants pour analyse
const IMPORTANT_FILE_EXTENSIONS = [
  ".json", ".js", ".ts", ".vue", ".html", ".py", ".java", ".go", ".php", ".rb"
];

// Fichiers clés qui donnent des informations sur le projet
const KEY_PROJECT_FILES = [
  "package.json", "tsconfig.json", "composer.json", "go.mod", 
  "requirements.txt", "Gemfile", "pom.xml", "build.gradle",
  ".env.example", "docker-compose.yml", "Dockerfile", "README.md",
  "webpack.config.js", "vite.config.js", "quasar.config.js", "angular.json",
  "next.config.js", "nuxt.config.js", ".babelrc"
];

export async function projectSummarizerTool(args: any): Promise<string> {
  // Parsing si args est une chaîne
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (error: any) {
      return `Erreur de parsing des arguments: ${error.message}`;
    }
  }

  const { projectPath } = args;
  const maxDepth = args.maxDepth || 4; // Profondeur d'exploration max (évite les explorations infinies)
  const maxFilesToAnalyze = args.maxFilesToAnalyze || 50; // Nombre maximum de fichiers à analyser en détail

  if (!projectPath || typeof projectPath !== "string") {
    return "Erreur: La clé 'projectPath' est requise et doit être une chaîne.";
  }

  try {
    // 1. Parcourir récursivement le projet pour identifier sa structure
    console.log(`Exploration du projet à ${projectPath} avec profondeur max ${maxDepth}...`);
    const { fileList, directoryStructure } = await exploreProject(projectPath, maxDepth);
    
    // 2. Filtrer et analyser les fichiers les plus pertinents
    console.log(`Analyse des fichiers pertinents (max ${maxFilesToAnalyze})...`);
    const filesToAnalyze = selectFilesToAnalyze(fileList, maxFilesToAnalyze);
    
    // 3. Lire et analyser le contenu des fichiers sélectionnés
    console.log("Lecture et analyse des fichiers clés...");
    const fileContents = await readFilesContent(filesToAnalyze);
    
    // 4. Analyser les technologies utilisées et générer un résumé
    console.log("Analyse des technologies et génération du résumé...");
    const projectAnalysis = analyzeProjectTechnology(fileContents, directoryStructure);
    
    return JSON.stringify(projectAnalysis, null, 2);
  } catch (error: any) {
    return `Erreur lors de l'analyse du projet: ${error.message}`;
  }
}

// Explorer le projet et construire sa structure
async function exploreProject(rootPath: string, maxDepth: number): Promise<{ fileList: string[], directoryStructure: any }> {
  const fileList: string[] = [];
  const directoryStructure: any = {};
  
  async function traverseDirectory(currentPath: string, relativePath: string, depth: number, structure: any) {
    if (depth > maxDepth) return;
    
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    // Ignorer les dossiers qui ne sont généralement pas pertinents pour l'analyse du projet
    const ignoreDirs = [
      "node_modules", ".git", "dist", "build", "coverage",
      ".next", ".nuxt", ".vscode", ".idea", "__pycache__"
    ];
    
    for (const entry of entries) {
      // Ignorer les dossiers à ne pas explorer
      if (entry.isDirectory() && ignoreDirs.includes(entry.name)) {
        continue;
      }
      
      const fullPath = path.join(currentPath, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        structure[entry.name] = {};
        await traverseDirectory(fullPath, entryRelativePath, depth + 1, structure[entry.name]);
      } else {
        fileList.push(fullPath);
        structure[entry.name] = null; // Marquer comme fichier (valeur null)
      }
    }
  }
  
  await traverseDirectory(rootPath, "", 0, directoryStructure);
  return { fileList, directoryStructure };
}

// Sélectionner les fichiers les plus pertinents à analyser en détail
function selectFilesToAnalyze(fileList: string[], maxFiles: number): string[] {
  // D'abord, prioriser les fichiers clés
  const keyFiles = fileList.filter(file => 
    KEY_PROJECT_FILES.includes(path.basename(file))
  );
  
  // Ensuite, ajouter d'autres fichiers avec des extensions importantes
  const otherImportantFiles = fileList.filter(file => 
    !keyFiles.includes(file) && 
    IMPORTANT_FILE_EXTENSIONS.includes(path.extname(file))
  );
  
  // Prioriser les fichiers à la racine et dans les principaux répertoires
  otherImportantFiles.sort((a, b) => {
    const depthA = a.split(path.sep).length;
    const depthB = b.split(path.sep).length;
    return depthA - depthB;
  });
  
  // Combiner les fichiers et limiter au nombre maximum
  return [...keyFiles, ...otherImportantFiles].slice(0, maxFiles);
}

// Lire le contenu des fichiers sélectionnés
async function readFilesContent(filePaths: string[]): Promise<Map<string, string>> {
  const fileContents = new Map<string, string>();
  
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      fileContents.set(filePath, content);
    } catch (error) {
      console.log(`Erreur lors de la lecture du fichier ${filePath}:`, error);
      fileContents.set(filePath, "Erreur de lecture");
    }
  }
  
  return fileContents;
}

// Analyser les technologies utilisées dans le projet
function analyzeProjectTechnology(
  fileContents: Map<string, string>, 
  directoryStructure: any
): any {
  // Structure de résultat
  const analysis = {
    overview: {
      name: "Projet non identifié",
      type: "Non déterminé",
      mainLanguages: [] as string[],
      frameworks: [] as string[],
      description: ""
    },
    structure: {
      directoryStructure,
      keyFiles: {} as Record<string, any>,
      fileTypes: {} as Record<string, number>
    },
    technologies: {
      backend: [] as string[],
      frontend: [] as string[],
      database: [] as string[],
      devops: [] as string[]
    },
    dependencies: {} as Record<string, any>,
    configFiles: {} as Record<string, any>,
    summary: ""
  };
  
  // Compteur d'extensions de fichiers
  const extensionCount: Record<string, number> = {};
  
  // Analyser les fichiers pour détecter les langages
  for (const [filePath, _] of fileContents) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext) {
      extensionCount[ext] = (extensionCount[ext] || 0) + 1;
    }
  }
  
  analysis.structure.fileTypes = extensionCount;
  
  // Déterminer les langages principaux par prévalence d'extensions
  const languageMapping: Record<string, string> = {
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".jsx": "JavaScript (React)",
    ".tsx": "TypeScript (React)",
    ".py": "Python",
    ".java": "Java",
    ".go": "Go",
    ".rb": "Ruby",
    ".php": "PHP",
    ".vue": "Vue.js",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".md": "Markdown"
  };
  
  // Déterminer les langages principaux
  for (const [ext, count] of Object.entries(extensionCount)) {
    if (languageMapping[ext] && count > 2) { // Au moins quelques fichiers du même type
      if (!analysis.overview.mainLanguages.includes(languageMapping[ext])) {
        analysis.overview.mainLanguages.push(languageMapping[ext]);
      }
    }
  }
  
  // Extraire et analyser des informations des fichiers clés
  for (const [filePath, content] of fileContents) {
    const fileName = path.basename(filePath);
    
    // Analyse des package.json pour les projets Node.js
    if (fileName === "package.json" && content !== "Erreur de lecture") {
      try {
        const packageJson = JSON.parse(content);
        
        // Récupérer le nom du projet
        if (packageJson.name) {
          analysis.overview.name = packageJson.name;
        }
        
        // Identifier le type de projet
        analysis.overview.type = "Node.js";
        
        // Extraire les dépendances
        if (packageJson.dependencies) {
          analysis.dependencies[filePath] = packageJson.dependencies;
          
          // Détecter les frameworks et librairies connus
          if (packageJson.dependencies.react) {
            analysis.technologies.frontend.push("React");
          }
          
          if (packageJson.dependencies.vue) {
            analysis.technologies.frontend.push("Vue.js");
          }
          
          if (packageJson.dependencies.angular || packageJson.dependencies["@angular/core"]) {
            analysis.technologies.frontend.push("Angular");
          }
          
          if (packageJson.dependencies.express) {
            analysis.technologies.backend.push("Express.js");
          }
          
          if (packageJson.dependencies.koa) {
            analysis.technologies.backend.push("Koa.js");
          }
          
          if (packageJson.dependencies.mongoose) {
            analysis.technologies.database.push("MongoDB (Mongoose)");
          }
          
          if (packageJson.dependencies.sequelize) {
            analysis.technologies.database.push("SQL (Sequelize)");
          }
          
          if (packageJson.dependencies.graphql) {
            analysis.technologies.backend.push("GraphQL");
          }

          if (packageJson.dependencies.next) {
            analysis.technologies.frontend.push("Next.js");
          }
          
          if (packageJson.dependencies.nuxt) {
            analysis.technologies.frontend.push("Nuxt.js");
          }
          
          if (packageJson.dependencies.quasar) {
            analysis.technologies.frontend.push("Quasar Framework");
          }

          analysis.overview.frameworks = [
            ...analysis.technologies.frontend,
            ...analysis.technologies.backend
          ].filter(Boolean);
        }
        
        // Stocker les infos du fichier pour référence
        analysis.structure.keyFiles[fileName] = {
          path: filePath,
          content: packageJson
        };
      } catch (error) {
        console.log(`Erreur lors de l'analyse du fichier ${filePath}:`, error);
      }
    }
    
    // Analyse de docker-compose.yml pour les projets conteneurisés
    else if (fileName === "docker-compose.yml" || fileName === "docker-compose.yaml") {
      analysis.technologies.devops.push("Docker");
      
      // Analyser les services pour détecter les bases de données
      if (content.includes("mongo:") || content.includes("mongodb:")) {
        analysis.technologies.database.push("MongoDB");
      }
      
      if (content.includes("mysql:") || content.includes("mariadb:")) {
        analysis.technologies.database.push("MySQL");
      }
      
      if (content.includes("postgres:") || content.includes("postgresql:")) {
        analysis.technologies.database.push("PostgreSQL");
      }
      
      if (content.includes("redis:")) {
        analysis.technologies.database.push("Redis");
      }
      
      // Stocker pour référence
      analysis.structure.keyFiles[fileName] = {
        path: filePath,
        summary: "Configuration Docker Compose"
      };
    }
    
    // Analyse des .env.example pour les variables d'environnement
    else if (fileName === ".env.example" || fileName === ".env") {
      analysis.structure.keyFiles[fileName] = {
        path: filePath,
        summary: "Variables d'environnement"
      };
    }
    
    // Analyser le README pour trouver la description du projet
    else if (fileName === "README.md") {
      // Extraire les premières lignes pour la description
      const lines = content.split("\n");
      let description = "";
      
      // Chercher un titre ou une description
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        if (line.startsWith("# ")) {
          const title = line.substring(2).trim();
          if (!analysis.overview.name.includes(title)) {
            analysis.overview.name = title;
          }
        } else if (line && !line.startsWith("#") && description.length < 200) {
          description += line + " ";
        }
      }
      
      if (description) {
        analysis.overview.description = description.trim();
      }
      
      analysis.structure.keyFiles[fileName] = {
        path: filePath,
        summary: "Documentation du projet"
      };
    }

    // Détection des frameworks front-end
    else if (fileName === "quasar.config.js") {
      analysis.technologies.frontend.push("Quasar Framework");
      analysis.overview.frameworks.push("Quasar Framework");
    }
    else if (fileName === "nuxt.config.js") {
      analysis.technologies.frontend.push("Nuxt.js");
      analysis.overview.frameworks.push("Nuxt.js");
    }
    else if (fileName === "next.config.js") {
      analysis.technologies.frontend.push("Next.js");
      analysis.overview.frameworks.push("Next.js");
    }
    else if (fileName === "angular.json") {
      analysis.technologies.frontend.push("Angular");
      analysis.overview.frameworks.push("Angular");
    }
    
    // Autres fichiers de configuration
    else if (KEY_PROJECT_FILES.includes(fileName)) {
      analysis.configFiles[fileName] = {
        path: filePath
      };
    }
  }
  
  // Déduplication des frameworks
  analysis.overview.frameworks = [...new Set(analysis.overview.frameworks)];
  analysis.technologies.frontend = [...new Set(analysis.technologies.frontend)];
  analysis.technologies.backend = [...new Set(analysis.technologies.backend)];
  analysis.technologies.database = [...new Set(analysis.technologies.database)];
  analysis.technologies.devops = [...new Set(analysis.technologies.devops)];
  
  // Génération d'un résumé du projet
  const summary = generateProjectSummary(analysis);
  analysis.summary = summary;
  
  return analysis;
}

// Générer un résumé textuel du projet
function generateProjectSummary(analysis: any): string {
  const { overview, technologies, structure } = analysis;
  
  const paragraphs = [];
  
  // Résumé général
  let generalSummary = `# ${overview.name}\n\n`;
  
  if (overview.description) {
    generalSummary += `${overview.description}\n\n`;
  }
  
  generalSummary += `Ce projet est principalement développé en ${overview.mainLanguages.join(", ")}.`;
  
  if (overview.frameworks && overview.frameworks.length > 0) {
    generalSummary += ` Il utilise les frameworks/technologies suivants: ${overview.frameworks.join(", ")}.`;
  }
  
  paragraphs.push(generalSummary);
  
  // Structure du projet
  const fileTypesCount = Object.keys(structure.fileTypes).length;
  const keyFilesCount = Object.keys(structure.keyFiles).length;
  
  paragraphs.push(`## Structure du projet\n\nLe projet contient ${fileTypesCount} types de fichiers différents` + 
    (keyFilesCount > 0 ? ` et ${keyFilesCount} fichiers clés identifiés.` : "."));
  
  // Technologies utilisées
  const techSections = [];
  
  if (technologies.frontend.length > 0) {
    techSections.push(`**Frontend**: ${technologies.frontend.join(", ")}`);
  }
  
  if (technologies.backend.length > 0) {
    techSections.push(`**Backend**: ${technologies.backend.join(", ")}`);
  }
  
  if (technologies.database.length > 0) {
    techSections.push(`**Base de données**: ${technologies.database.join(", ")}`);
  }
  
  if (technologies.devops.length > 0) {
    techSections.push(`**DevOps**: ${technologies.devops.join(", ")}`);
  }
  
  if (techSections.length > 0) {
    paragraphs.push(`## Technologies\n\n${techSections.join("\n\n")}`);
  }
  
  // Recommandations et observations
  const observations = [];
  
  // Si Docker est utilisé
  if (technologies.devops.includes("Docker")) {
    observations.push("Le projet utilise Docker pour la conteneurisation, ce qui facilite le déploiement et l'exécution.");
  }
  
  // Si un framework front-end est détecté
  if (technologies.frontend.length > 0) {
    observations.push(`L'interface utilisateur est basée sur ${technologies.frontend.join(", ")}.`);
  }
  
  // Si une base de données est détectée
  if (technologies.database.length > 0) {
    observations.push(`Le projet utilise ${technologies.database.join(", ")} pour le stockage des données.`);
  }
  
  if (observations.length > 0) {
    paragraphs.push(`## Observations\n\n- ${observations.join("\n- ")}`);
  }
  
  return paragraphs.join("\n\n");
}