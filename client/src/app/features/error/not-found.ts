import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="error-layout">
      <div class="glass-panel error-card">
        <div class="spark-icon">✦ 404 ✦</div>
        <h1>Lost in the Timeline?</h1>
        <p class="subtitle">The page you're looking for has drifted off the scheduling grid.</p>
        <a routerLink="/" class="action-btn">Return to Workstation</a>
      </div>
    </div>
  `,
  styles: [`
    .error-layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      align-items: center;
      justify-content: center;
      background-image: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
                        radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.15), transparent 40%);
    }
    .error-card {
      padding: 3rem;
      text-align: center;
      max-width: 480px;
      width: 90%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .spark-icon {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--accent-secondary);
      text-transform: uppercase;
      margin-bottom: 1rem;
      background: linear-gradient(90deg, #ec4899, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.75rem;
    }
    .subtitle {
      color: var(--text-secondary);
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .action-btn {
      display: inline-block;
      background: linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%);
      color: white;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: var(--radius-full);
      font-size: 0.95rem;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    }
    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
      background: linear-gradient(135deg, #6d28d9 0%, var(--accent-primary) 100%);
    }
  `]
})
export class NotFoundComponent {}
