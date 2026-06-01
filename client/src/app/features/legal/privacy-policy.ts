import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="legal-layout">
      <div class="glass-panel legal-card">
        <header class="legal-header">
          <div class="header-glow"></div>
          <h1>Privacy Policy</h1>
          <p class="subtitle">Effective Date: June 1, 2026</p>
        </header>

        <div class="legal-content">
          <p class="intro">
            Welcome to <strong>Schedulist</strong> (hosted at <code>schedulist.dev</code>). Your privacy is of paramount importance to us. This Privacy Policy details what information we collect, how we use it, and the strict safeguards we have in place to keep your data secure.
          </p>

          <section>
            <h2>1. Information We Collect</h2>
            <p>We collect and process the following categories of information to provide you with the modular scheduling workstation experience:</p>
            <ul>
              <li><strong>Account Credentials:</strong> Basic profile information retrieved from your Google Account authentication (Name, Email address, and Google User ID).</li>
              <li><strong>Task & Scheduling Data:</strong> Topic cards, checklist items, and scheduled instances that you create directly inside the app.</li>
              <li><strong>Integration Tokens:</strong> If you connect external services (Google Calendar, Google Tasks, or Microsoft To-Do), we securely store the OAuth access and refresh tokens required to sync your tasks and events on your behalf.</li>
            </ul>
          </section>

          <section>
            <h2>2. How We Use Integration Data</h2>
            <p>Schedulist utilizes third-party API scopes to synchronize your workspace timelines. Specifically:</p>
            <ul>
              <li><strong>Google Calendar & Tasks:</strong> Used strictly to fetch and display read-only Google Calendar events on your calendar grid, and to synchronize tasks/completions bi-directionally between Schedulist cards and Google Tasks.</li>
              <li><strong>Microsoft To-Do:</strong> Used to sync scheduled items to your Microsoft To-Do folders in real-time.</li>
            </ul>
            <p class="highlight-box">
              <strong>Data Protection Guarantee:</strong> We do not sell, rent, trade, or share your tasks, schedule timelines, or profile information with any third-party marketing services. Third-party OAuth tokens are stored in an encrypted state and used solely for API request signing.
            </p>
          </section>

          <section>
            <h2>3. Data Retention & Deletion</h2>
            <p>You maintain full ownership of your data. You can delete your account and all associated task logs, credentials, and tokens at any time using the <strong>"Delete Data"</strong> option in the workspace sidebar. This operation completely wipes your records from our databases instantly and cannot be undone.</p>
          </section>

          <section>
            <h2>4. Security Standards</h2>
            <p>We employ modern industry-standard security practices, including database encryption, HTTP Strict Transport Security (HSTS), and secure HTTPS APIs. Our backend runs within locked-down isolated containers, and client connections are audited for token validity on every request.</p>
          </section>

          <section>
            <h2>5. Contact Us</h2>
            <p>If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us directly at:</p>
            <p class="contact-email">
              <a href="mailto:lasse.andresen9@gmail.com">lasse.andresen9@gmail.com</a>
            </p>
          </section>
        </div>

        <footer class="legal-footer">
          <a routerLink="/" class="back-btn">Back to Workstation</a>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .legal-layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      padding: 2rem 1rem;
      justify-content: center;
      background-image: radial-gradient(circle at top right, rgba(99, 102, 241, 0.12), transparent 40%),
                        radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.12), transparent 40%);
      overflow-y: auto;
    }
    .legal-card {
      padding: 2.5rem;
      max-width: 800px;
      width: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      margin: auto;
    }
    .legal-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 1.5rem;
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
      background: linear-gradient(90deg, #ec4899, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.85rem;
    }
    .legal-content {
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.7;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .intro {
      font-size: 1.05rem;
      color: var(--text-primary);
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.75rem;
    }
    section ul {
      margin-top: 0.5rem;
      margin-left: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    code {
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: var(--accent-secondary);
    }
    .highlight-box {
      background: rgba(99, 102, 241, 0.04);
      border-left: 3px solid var(--accent-primary);
      padding: 1rem;
      border-radius: 4px;
      margin-top: 1rem;
    }
    .contact-email {
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .contact-email a {
      color: var(--accent-primary);
      text-decoration: none;
      transition: color 0.2s;
    }
    .contact-email a:hover {
      color: var(--accent-secondary);
    }
    .legal-footer {
      margin-top: 2.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 1.5rem;
      display: flex;
      justify-content: flex-end;
    }
    .back-btn {
      display: inline-block;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
      text-decoration: none;
      padding: 10px 24px;
      border-radius: var(--radius-full);
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.2s, border-color 0.2s;
    }
    .back-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class PrivacyPolicyComponent {}
