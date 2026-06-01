import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="legal-layout">
      <div class="glass-panel legal-card">
        <header class="legal-header">
          <div class="header-glow"></div>
          <h1>Terms of Service</h1>
          <p class="subtitle">Effective Date: June 1, 2026</p>
        </header>

        <div class="legal-content">
          <p class="intro">
            Welcome to <strong>Schedulist</strong> (hosted at <code>schedulist.dev</code>). By accessing our website and using our modular scheduling workstation services, you agree to comply with and be bound by the following Terms of Service.
          </p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By registering for an account or using Schedulist, you agree to be bound by these Terms. If you do not agree to all terms, you must immediately cease using the platform and delete your account data.</p>
          </section>

          <section>
            <h2>2. User Account and Conduct</h2>
            <p>You access Schedulist by authenticating via your Google Account. You are responsible for maintaining the security of your account credentials and integrations. You agree not to use the platform for any unlawful activities or in a manner that disrupts the performance, integrity, or security of the hosting service or APIs.</p>
          </section>

          <section>
            <h2>3. Integration APIs (Google & Microsoft)</h2>
            <p>Schedulist provides features to interface directly with Google Calendar, Google Tasks, and Microsoft To-Do APIs. Your use of these integrations is governed by the respective terms of those third-party providers. We do not control or take responsibility for errors, data losses, or outages occurring on external services.</p>
            <p>We reserve the right to temporarily disable or restrict API calls to prevent quota exhaustion or abuse.</p>
          </section>

          <section>
            <h2>4. Limitation of Liability</h2>
            <p class="highlight-box">
              <strong>Service Disclaimer:</strong> Schedulist is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties that the service will be completely uninterrupted, secure, or free from data inaccuracies. In no event shall Schedulist or its developers be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use this planning software.
            </p>
          </section>

          <section>
            <h2>5. Modifications to Service and Terms</h2>
            <p>We reserve the right to modify or discontinue Schedulist (or any part of it) at any time. We may also revise these Terms. If changes are substantial, we will post notices on the website login page or notify registered users.</p>
          </section>

          <section>
            <h2>6. Governing Law & Contact</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws applicable to online service providers. For questions regarding these Terms, contact us at:</p>
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
    code {
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: var(--accent-secondary);
    }
    .highlight-box {
      background: rgba(236, 72, 153, 0.03);
      border-left: 3px solid var(--accent-secondary);
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
export class TermsOfServiceComponent {}
