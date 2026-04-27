import path from 'node:path';
import { cancel, confirm, intro, isCancel, outro, text } from '@clack/prompts';
import { type CliFlags, type ScaffoldOptions } from './types.js';
import { getDefaultProjectName, validateProjectName } from './utils/project-name.js';

function handleCancel(value: unknown) {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
}

export async function resolveScaffoldOptions(
  positionalDir: string | undefined,
  flags: CliFlags,
): Promise<ScaffoldOptions> {
  intro('create-ai-fullstack');

  const defaultName = getDefaultProjectName(positionalDir);
  const nameResponse = positionalDir
    ? defaultName
    : await text({
        message: 'Project name',
        placeholder: defaultName,
        defaultValue: defaultName,
        validate: (value) => validateProjectName(value ?? ''),
      });
  handleCancel(nameResponse);

  const projectName = String(nameResponse);

  const validationError = validateProjectName(projectName);
  if (validationError) throw new Error(validationError);

  const targetDir = path.resolve(positionalDir ?? projectName);

  let git = flags.git ?? true;
  if (flags.git === undefined) {
    const response = await confirm({
      message: 'Initialize a git repository?',
      initialValue: true,
    });
    handleCancel(response);
    git = Boolean(response);
  }

  let install = flags.install ?? true;
  if (flags.install === undefined) {
    const response = await confirm({
      message: 'Install dependencies now?',
      initialValue: true,
    });
    handleCancel(response);
    install = Boolean(response);
  }

  outro(`Scaffolding ${projectName}`);
  return { projectName, targetDir, install, git };
}
