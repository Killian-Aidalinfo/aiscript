// file: DependencyAnalysisTool.ts
import fs from "fs/promises";
import path from "path";

interface DependencyAnalysisArgs {
  projectPath: string;
  includeDevDependencies?: boolean;
}

export async function dependencyAnalysisTool(args: any): Promise<string> {
  // Parsing si args est une chaîne
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (error: any) {
      return `Erreur de parsing des arguments: ${error.message}`;
    }
  }

  const { projectPath } = args;
  const includeDevDependencies = args.includeDevDependencies !== false; // True par défaut

  if (!projectPath || typeof projectPath !== "string") {
    return "Erreur: La clé 'projectPath' est requise et doit être une chaîne.";
  }

  // Normalisation du chemin
  const resolvedPath = path.resolve(projectPath);

  // Structure de résultat
  const result: Record<string, any> = {
    projectPath: resolvedPath,
    dependencies: {},
    dependencyGraph: {},
    summary: ""
  };

  try {
    // Déterminer le type de projet en vérifiant les fichiers de configuration
    const files = await fs.readdir(resolvedPath);
    
    // Analyser les dépendances selon le type de projet
    if (files.includes("package.json")) {
      // Projet JavaScript/Node.js
      await analyzeNodeProject(resolvedPath, includeDevDependencies, result);
    } else if (files.includes("requirements.txt")) {
      // Projet Python
      await analyzePythonProject(resolvedPath, result);
    } else if (files.includes("pom.xml")) {
      // Projet Java/Maven
      await analyzeMavenProject(resolvedPath, result);
    } else if (files.includes("build.gradle")) {
      // Projet Gradle
      await analyzeGradleProject(resolvedPath, result);
    } else if (files.includes("go.mod")) {
      // Projet Go
      await analyzeGoProject(resolvedPath, result);
    } else if (files.includes("Cargo.toml")) {
      // Projet Rust
      await analyzeRustProject(resolvedPath, result);
    } else if (files.includes("composer.json")) {
      // Projet PHP
      await analyzePhpProject(resolvedPath, result);
    } else if (files.includes("Gemfile")) {
      // Projet Ruby
      await analyzeRubyProject(resolvedPath, result);
    } else {
      result.summary = "Aucun fichier de configuration de dépendances reconnu trouvé dans ce projet.";
    }

    return JSON.stringify(result, null, 2);
  } catch (error: any) {
    return `Erreur lors de l'analyse des dépendances: ${error.message}`;
  }
}

// Analyse d'un projet Node.js
async function analyzeNodeProject(
  projectPath: string, 
  includeDevDependencies: boolean,
  result: Record<string, any>
): Promise<void> {
  try {
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent);

    result.projectType = "Node.js/JavaScript";
    result.projectName = packageJson.name || "N/A";
    result.projectVersion = packageJson.version || "N/A";
    
    // Dépendances principales
    const dependencies = packageJson.dependencies || {};
    result.dependencies = { ...dependencies };
    
    // Dépendances de développement (optionnel)
    if (includeDevDependencies && packageJson.devDependencies) {
      result.devDependencies = packageJson.devDependencies;
    }
    
    // Dépendances peer (optionnel)
    if (packageJson.peerDependencies) {
      result.peerDependencies = packageJson.peerDependencies;
    }
    
    // Frameworks et technologies détectés
    const detectedTechs = [];
    
    if (dependencies.react) detectedTechs.push("React");
    if (dependencies["react-dom"]) detectedTechs.push("React DOM");
    if (dependencies.vue) detectedTechs.push("Vue.js");
    if (dependencies.angular || dependencies["@angular/core"]) detectedTechs.push("Angular");
    if (dependencies.next) detectedTechs.push("Next.js");
    if (dependencies.nuxt) detectedTechs.push("Nuxt.js");
    if (dependencies.express) detectedTechs.push("Express.js");
    if (dependencies.koa) detectedTechs.push("Koa.js");
    if (dependencies["@nestjs/core"]) detectedTechs.push("NestJS");
    if (dependencies.electron) detectedTechs.push("Electron");
    
    result.detectedTechnologies = detectedTechs;
    
    // Génération du résumé
    const depCount = Object.keys(dependencies).length;
    const devDepCount = includeDevDependencies && packageJson.devDependencies 
      ? Object.keys(packageJson.devDependencies).length 
      : 0;
    
    result.summary = [
      `Projet ${result.projectName} (v${result.projectVersion})`,
      `Type: ${result.projectType}`,
      `Nombre de dépendances: ${depCount}`,
      includeDevDependencies ? `Nombre de dépendances de développement: ${devDepCount}` : "",
      `Technologies détectées: ${detectedTechs.join(", ") || "Aucune technologie spécifique détectée"}`
    ].filter(line => line).join("\n");
  } catch (error: any) {
    throw new Error(`Erreur lors de l'analyse du projet Node.js: ${error.message}`);
  }
}

// Analyse d'un projet Python
async function analyzePythonProject(
  projectPath: string,
  result: Record<string, any>
): Promise<void> {
  try {
    const requirementsPath = path.join(projectPath, "requirements.txt");
    const requirementsContent = await fs.readFile(requirementsPath, "utf8");
    
    const dependencies: Record<string, string> = {};
    const lines = requirementsContent.split("\n");
    const detectedTechs = [];
    
    // Analyser chaque ligne du fichier requirements.txt
    for (const line of lines) {
      // Ignorer les commentaires et les lignes vides
      if (line.trim().startsWith("#") || line.trim() === "") continue;
      
      // Extraire le nom et la version de la dépendance
      const parts = line.split("==");
      const name = parts[0].trim();
      const version = parts.length > 1 ? parts[1].trim() : "latest";
      
      dependencies[name] = version;
      
      // Détecter les frameworks
      if (name === "django") detectedTechs.push("Django");
      if (name === "flask") detectedTechs.push("Flask");
      if (name === "fastapi") detectedTechs.push("FastAPI");
      if (name === "streamlit") detectedTechs.push("Streamlit");
      if (name === "dash") detectedTechs.push("Dash");
      if (name === "numpy") detectedTechs.push("NumPy");
      if (name === "pandas") detectedTechs.push("Pandas");
      if (name === "tensorflow") detectedTechs.push("TensorFlow");
      if (name === "torch") detectedTechs.push("PyTorch");
    }
    
    result.projectType = "Python";
    result.dependencies = dependencies;
    result.detectedTechnologies = detectedTechs;
    
    // Vérifier s'il y a un setup.py
    try {
      await fs.access(path.join(projectPath, "setup.py"));
      result.hasSetupPy = true;
    } catch {
      result.hasSetupPy = false;
    }
    
    // Générer le résumé
    const depCount = Object.keys(dependencies).length;
    result.summary = [
      `Projet Python`,
      `Nombre de dépendances: ${depCount}`,
      `Technologies détectées: ${detectedTechs.join(", ") || "Aucune technologie spécifique détectée"}`
    ].join("\n");
  } catch (error: any) {
    throw new Error(`Erreur lors de l'analyse du projet Python: ${error.message}`);
  }
}

// Fonctions pour analyser d'autres types de projets
// Ces implémentations sont simplifiées mais peuvent être étendues

async function analyzeMavenProject(
  projectPath: string,
  result: Record<string, any>
): Promise<void> {
  result.projectType = "Java (Maven)";
  result.summary = "Analyse de projets Maven implémentée de façon basique. Un fichier pom.xml a été détecté.";
}

async function analyzeGradleProject(
  projectPath: string,
  result: Record<string, any>
): Promise<void> {
  result.projectType = "Java/Kotlin (Gradle)";
  result.summary = "Analyse de projets Gradle implémentée de façon basique. Un fichier build.gradle a été détecté.";
}

async function analyzeGoProject(
  projectPath: string,
  result: Record<string, any>
): Promise<void> {
  result.projectType = "Go";
  result.summary = "Analyse de projets Go implémentée de façon basique. Un fichier go.mod a été détecté.";
}

async function analyzeRustProject(
  projectPath: string,
  result: Record<string, any>
): Promise<void> {
  result.projectType = "Rust";
  result.summary = "Analyse de projets Rust implémentée de façon basique. Un fichier Cargo.toml a été détecté.";
}

async function analyzePhpProject(
  projectPath: string,
  result: Record<string, any>
): Promise<void> {
  result.projectType = "PHP";
  result.summary = "Analyse de projets PHP implémentée de façon basique. Un fichier composer.json a été détecté.";
}

async function analyzeRubyProject(
  projectPath: string,
  result: Record<string, any>
): Promise<void> {
  result.projectType = "Ruby";
  result.summary = "Analyse de projets Ruby implémentée de façon basique. Un fichier Gemfile a été détecté.";
}