import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-layout">
      <div class="glass-panel login-card">
        <h1>LifePlanner</h1>
        <p class="subtitle">Organize your life, perfectly.</p>
        
        <button class="google-btn" (click)="login()">
          <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
            </g>
          </svg>
          Sign in with Google
        </button>
        <p class="disclaimer">You need to set up Google Cloud Credentials for this to work.</p>
      </div>
    </div>
  `,
  styles: [`
    .login-layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      align-items: center;
      justify-content: center;
      background-image: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
                        radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.15), transparent 40%);
    }
    .login-card {
      padding: 3rem;
      text-align: center;
      max-width: 400px;
      width: 90%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: var(--red-to-pink-to-purple-horizontal-gradient, linear-gradient(90deg, #ec4899, #6366f1));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }
    .google-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      color: #3c4043;
      border: none;
      padding: 12px 24px;
      border-radius: var(--radius-full);
      font-size: 1rem;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .google-btn:hover {
      background: #f8f9fa;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.15);
    }
    .disclaimer {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);

  login() {
    this.authService.login();
  }
}
