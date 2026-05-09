import { Injectable, inject, signal } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly oauthService = inject(OAuthService);
  private readonly userService = inject(UserService);

  public readonly isLoggedIn = signal(false);
  public readonly userProfile = signal<any>(null);

  /**
   * Resolves once loadDiscoveryDocumentAndTryLogin() has completed.
   * The authGuard awaits this before making any routing decisions, preventing
   * the guard from running before the OAuth callback tokens are parsed from the URL hash.
   */
  public readonly initialized: Promise<void>;

  constructor() {
    this.initialized = this.configure();
  }

  private async configure(): Promise<void> {
    this.oauthService.configure(authConfig);
    await this.oauthService.loadDiscoveryDocumentAndTryLogin();

    if (this.oauthService.hasValidIdToken()) {
      this.isLoggedIn.set(true);

      // Bootstrap the backend user immediately after token is confirmed valid
      const idToken = this.oauthService.getIdToken();
      this.userService.bootstrapUser(idToken).subscribe();

      // Load Google profile in the background for display purposes
      this.oauthService.loadUserProfile()
        .then(profile => this.userProfile.set(profile))
        .catch(() => { /* non-critical */ });
    } else {
      this.isLoggedIn.set(false);
    }
  }

  public login() {
    this.oauthService.initImplicitFlow();
  }

  public logout() {
    this.oauthService.logOut();
    this.isLoggedIn.set(false);
    this.userProfile.set(null);
    this.userService.currentUser.set(null);
  }

  public get token() {
    return this.oauthService.getIdToken();
  }
}
