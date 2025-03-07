export interface LSToolParams {
  path: string;
  ignore?: string[];
}

export class LSTool {
  async execute(params: LSToolParams): Promise<string[]> {
    const { path, ignore = [] } = params;
    
    // Here you would implement the actual directory listing
    // This is a placeholder for the actual implementation
    console.log(`Listing files in directory: ${path}`);
    if (ignore.length > 0) {
      console.log(`Ignoring patterns: ${ignore.join(', ')}`);
    }
    
    return [`${path}/example-file.txt`, `${path}/example-directory/`];
  }
}