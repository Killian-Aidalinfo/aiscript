export interface GlobToolParams {
  pattern: string;
  path?: string;
}

export class GlobTool {
  async execute(params: GlobToolParams): Promise<string[]> {
    const { pattern, path = '.' } = params;
    
    // Here you would implement the actual glob pattern matching
    // This is a placeholder for the actual implementation
    console.log(`Searching for pattern: ${pattern} in path: ${path}`);
    
    return [`${path}/example-match-${pattern}`];
  }
}