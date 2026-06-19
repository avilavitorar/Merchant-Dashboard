import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // Essa linha gerencia a detecção de mudanças e exige o Zone.js importado no main.ts
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient()
  ]
};
