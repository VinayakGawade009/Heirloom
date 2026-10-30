import type { ErrorCode } from '../types';

export function errorMessage(code?: ErrorCode | string | null): string {
  switch (code) {
    case 'ollama_not_running':
      return 'The model is not running. Start Ollama and try again.';
    case 'model_not_installed':
      return 'That model is not installed on this computer.';
    case 'model_failed':
      return 'The model could not read this page. Try again, or try another model in Settings.';
    case 'unknown':
    default:
      return 'Something went wrong. Try again.';
  }
}
