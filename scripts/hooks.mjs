// Activa los hooks de .githooks/ (gitleaks antes de cada commit). Lo corre `npm install` (prepare).
// En Vercel o en CI no hay repo git: si falla, no hace nada.
import { execSync } from 'node:child_process';
if (!process.env.CI && !process.env.VERCEL) {
  try { execSync('git config core.hooksPath .githooks', { stdio: 'ignore' }); } catch { /* sin git */ }
}
