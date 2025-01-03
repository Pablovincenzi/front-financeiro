import { existsSync, unlinkSync } from 'fs';
import { defineConfig } from 'cypress';
import { nxComponentTestingPreset } from '@nx/angular/plugins/component-testing';

export default defineConfig({
  viewportWidth: 1366,
  viewportHeight: 768,
  retries: 3,
  component: {
    ...nxComponentTestingPreset(__filename),

    setupNodeEvents(on) {
      on('after:spec', (_spec: Cypress.Spec, results: CypressCommandLine.RunResult) => {
        if (results && results.video) {
          // Filtra testes com falha
          const failures = results.tests.some(test =>
            test.attempts.some(attempt => attempt.state === 'failed')
          );

          // Se não possui testes com falha, deleta o vídeo do teste
          if (!failures && existsSync(results.video)) {
            unlinkSync(results.video);
          }
        }
      });
    }
  }
});
