import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const oauthService = inject(OAuthService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialization to complete before deciding anything.
  // Without this, the guard runs synchronously before the OAuth callback tokens
  // are parsed from the URL hash, causing a false redirect to /login that
  // destroys the hash containing the tokens.
  await authService.initialized;

  if (oauthService.hasValidIdToken()) {
    return true;
  }

  return router.parseUrl('/login');
};
