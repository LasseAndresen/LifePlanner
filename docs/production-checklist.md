# 🚀 LifePlanner Production Readiness Checklist

This document details the checklist of setups, optimizations, security hardening, and deployment tasks required to transition the **LifePlanner** application from a local development state to a secure, stable, and high-performing production environment.

---

## 📂 Quick Links
- Frontend Client Config: [environment.ts](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/client/src/environments/environment.ts) | [package.json](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/client/package.json)
- Backend API Config: [Program.cs](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/server/Program.cs) | [appsettings.json](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/server/appsettings.json)
- Project Architecture Reference: [architecture.md](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/docs/architecture.md)

---

## 🗄️ 1. Database & Persistence

Currently, the application uses local SQLite instances. For production-grade availability, performance, and scaling:

- [ ] **Migrate to PostgreSQL / SQL Server**
  - [ ] Set up a managed database instance (e.g., Azure Database for PostgreSQL, AWS RDS PostgreSQL, Supabase).
  - [ ] Install the appropriate EF Core provider package (e.g., `Npgsql.EntityFrameworkCore.PostgreSQL` for PostgreSQL).
  - [ ] Conditionally load the SQLite provider in Development and the production provider in Release/Staging environments in [Program.cs](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/server/Program.cs#L13-L14).
- [ ] **Database Connection Strings**
  - [ ] Ensure database connection strings are never committed to the repo (remove any production connections from `appsettings.json`).
  - [ ] Configure connection string extraction from environment variables (e.g., `ConnectionStrings__DefaultConnection`).
- [ ] **EF Core Optimization**
  - [ ] Enable DbContext pooling (`AddDbContextPool<LifePlannerDbContext>`) in production to optimize database connection reuse.
- [ ] **Migration Strategy**
  - [ ] Generate EF Core migration bundles (`dotnet ef migrations bundle`) in the CI/CD pipeline.
  - [ ] Run migration bundles during release deployment rather than running migrations automatically at application startup (`context.Database.Migrate()`) to avoid concurrency issues with multiple container instances.
- [ ] **Backup and Restore Plan**
  - [ ] Set up automated daily snapshots and point-in-time recovery (PITR) with at least 7-day retention.

---

## 🔑 2. Secrets & Configuration Management

Sensitive configuration parameters must be handled securely outside of source control.

- [ ] **API Secret Relocation**
  - [ ] Move Microsoft OAuth client credentials (`Microsoft:ClientId`, `Microsoft:ClientSecret`) out of [appsettings.json](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/server/appsettings.json#L24-L28).
  - [ ] Move Google OAuth credentials from code or configuration files.
  - [ ] Move JWT signature validation keys out of code/settings.
- [ ] **External Vault/Secret Store Integration**
  - [ ] Integrate a cloud-native secret provider (e.g. Doppler, Azure Key Vault, AWS Secrets Manager, or Env variables) in the production backend hosting container.
- [ ] **Environment Configuration Files**
  - [ ] Set up a proper production environment config on the Angular client: [environment.ts](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/client/src/environments/environment.ts).
  - [ ] Configure the API base URL dynamically to point to the production backend server domain.

---

## 🔒 3. API Security Hardening

To guard against malicious activity, coordinate server and browser security standards.

- [ ] **CORS Configuration**
  - [ ] Lock down backend CORS policy. Replace `"AllowAngularDev"` in [Program.cs](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/server/Program.cs#L28-L34) with policies restricting origins strictly to the authorized production frontend domain name.
- [ ] **HTTPS & HSTS**
  - [ ] Configure HTTP Strict Transport Security (HSTS) with a long duration (`max-age=31536000; includeSubDomains; preload`).
  - [ ] Enforce HTTPS redirection in the hosting environment or reverse proxy.
- [ ] **Secure Security Headers**
  - [ ] Configure the reverse proxy (Nginx/Cloudflare) or add middleware (e.g. NetEscapades.AspNetCore.SecurityHeaders) to inject:
    - `Content-Security-Policy` (CSP)
    - `X-Frame-Options` (deny clickjacking)
    - `X-Content-Type-Options` (nosniff)
    - `Referrer-Policy` (strict-origin-when-cross-origin)
    - `Permissions-Policy` (limit geolocation, camera, microphone, etc.)
- [ ] **Authentication Cookie & Token Hardening**
  - [ ] If using cookies, ensure flags are set: `HttpOnly=true`, `Secure=true`, and `SameSite=Strict`.
  - [ ] Set JWT token expiration to a short window (e.g., 15 minutes) and issue secure Refresh Tokens.
- [ ] **Rate Limiting**
  - [ ] Implement ASP.NET Core Rate Limiting middleware to prevent brute force and DDoS attacks on auth endpoints and third-party sync routes.

---

## ⚡ 4. Build & Performance Optimization

Optimizing loading and runtime speeds for frontend responsiveness and server efficiency.

### Frontend (Angular)
- [ ] **Production-Optimized Build**
  - [ ] Verify `npm run build` is using `--configuration production` (forces AOT compilation, minification, tree-shaking, and index optimization).
  - [ ] Verify source maps are disabled in production builds to hide proprietary typescript logic.
- [ ] **Performance & Asset Loading**
  - [ ] Configure dynamic lazy-loading for Angular router paths inside [app.routes.ts](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/client/src/app/app.routes.ts) to minimize initial bundle payload size.
  - [ ] Compress all static image assets (favicons, hero banners, placeholders) using modern formats (WebP, AVIF) and cache them at the CDN layer.
  - [ ] Serve the Angular bundle with compression enabled (Brotli or Gzip) via the hosting provider (e.g., Cloudflare, Nginx, or Netlify).

### Backend (.NET API)
- [ ] **Publish Configuration**
  - [ ] Run backend builds in `Release` configuration (`dotnet publish -c Release`).
  - [ ] Enable response compression middleware (`builder.Services.AddResponseCompression()`) for payloads like event JSON collections.
- [ ] **Caching Layer**
  - [ ] Implement response caching (`builder.Services.AddResponseCaching()`) or in-memory distributed cache (e.g. Redis) for static database settings or non-sensitive, frequent read endpoints.

---

## 📊 5. Logging, Monitoring & Diagnostics

Observability ensures errors are caught and solved before they impact end-users.

- [ ] **Structured JSON Logging**
  - [ ] Set up a structured logger like Serilog to write logs in JSON format to stdout, enabling smooth parsing by modern log shippers.
- [ ] **Log Level Management**
  - [ ] Adjust [appsettings.json](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/server/appsettings.json#L2-L17) log levels in production to suppress noisy EF Core and HTTP server logs, outputting only `Warning` or `Error` for frameworks, and `Information` for application-level activities.
- [ ] **Health Checks**
  - [ ] Register health check middleware (`builder.Services.AddHealthChecks()`) exposing `/health/live` and `/health/ready` endpoints to monitor database status and container health.
- [ ] **Application Performance Monitoring (APM)**
  - [ ] Integrate an APM and crash reporter (e.g., Sentry, Azure Application Insights, or Datadog) to track client-side Angular errors and backend unhandled exceptions.

---

## 🐋 6. Containerization & Hosting

- [ ] **Dockerization**
  - [ ] **Backend Dockerfile**: Define a multi-stage Docker build targetting .NET 10 ASP.NET runtime.
  - [ ] **Frontend Dockerfile**: Create a multi-stage Docker build compiling Angular static assets and serving them through an optimized Nginx web server.
  - [ ] **Docker Compose**: Construct a `docker-compose.prod.yml` to stitch the frontend, backend, and PostgreSQL database together for local replica testing.
- [ ] **Hosting Selection & Domain Configuration**
  - [ ] Deploy client static assets to a serverless edge provider (e.g., Azure Static Web Apps, Netlify, or Vercel).
  - [ ] Deploy the backend API to a container service (e.g., Azure App Service, AWS ECS, Render, or Fly.io).
  - [ ] Set up custom domains and configure automatic SSL/TLS certificate updates via Let's Encrypt or ACM.

---

## 🔄 7. Integration & Sync Resilience

With integration dependencies on Google Calendar, Google Tasks, and Microsoft To-Do APIs:

- [ ] **Transient Fault Handling**
  - [ ] Integrate **Polly** policies into the dependency-injected [HttpClient instances](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/server/Program.cs#L23) to gracefully handle temporary external network dropouts or timeouts.
- [ ] **Token Expiry Management**
  - [ ] Implement robust token refresh handler logic. Ensure expired access tokens trigger a background oauth refresh cycle automatically without throwing 401s to the UI.
- [ ] **API Quota & Rate Limit Defenses**
  - [ ] Gracefully handle `429 Too Many Requests` responses from Google/Microsoft APIs, displaying user-friendly warnings or queueing retry synchronization triggers.

---

## 🧪 8. Continuous Integration & Testing

Validate that the application codebase remains stable as changes are committed.

- [ ] **Automated CI Workflow**
  - [ ] Build a GitHub Actions configuration `.github/workflows/ci.yml` that triggers on pull requests to:
    - [ ] Install node dependencies, run `npm run lint` format checks.
    - [ ] Execute Angular tests via Vitest (`npm run test`).
    - [ ] Run backend tests (`dotnet test` in [server.tests.csproj](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/server.tests/server.tests.csproj)).
    - [ ] Verify both frontend and backend build success.
- [ ] **End-to-End (E2E) Testing**
  - [ ] Create basic E2E smoke tests using Playwright or Cypress to cover user authentication, dashboard page renders, and card CRUD loops.

---

## 🏷️ 9. SEO & Compliance

Ensure the product looks premium, professional, and is legally compliant.

- [ ] **SEO Meta Tags & Titles**
  - [ ] Set up dynamic title and description generation on Angular routing using Angular’s `Title` and `Meta` services.
  - [ ] Add open graph tags (`og:title`, `og:image`, `og:description`) for clean visual display when shared.
- [ ] **UX Polishing**
  - [ ] Replace standard template favicons with branded LifePlanner icons.
  - [ ] Provide standard, branded error fallback views for 404 (Not Found) and 500 (Internal Server Error) situations.
- [ ] **Privacy & Compliance**
  - [ ] Add a Terms of Service and Privacy Policy page, including details on how third-party calendar data is collected, stored, and integrated.
  - [ ] Add a Cookie Consent banner if cookie-based analytics or trackers are added.
