export interface CliFlags {
  install?: boolean;
  git?: boolean;
}

export interface ScaffoldOptions {
  projectName: string;
  targetDir: string;
  install: boolean;
  git: boolean;
}
