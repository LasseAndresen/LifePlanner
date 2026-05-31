# 🌌 Schedulist

[![Angular](https://img.shields.io/badge/Angular-19+-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Schedulist** is a modular life scheduling workstation that bridges the gap between structured time management (calendars) and unstructured task management (checklists and ideas). Drag and drop list items directly onto your calendar grid to schedule them as independent, syncable instances.

![Schedulist Hero](./docs/images/hero.png)

---

## 🎯 The Core Problem & Solution

Traditional planners are fragmented:
1. **Calendars** excel at tracking *time*, but are terrible for managing unstructured tasks, checklists, and brainstorming.
2. **To-Do Apps** excel at tracking *lists*, but lack visual time context, leading to over-commitment and friction.

**Schedulist** acts as the bridge. Create modular **Topic Cards** for projects, routines, and ideas, and drag individual checklist items directly onto your calendar grid. Schedule a single task across multiple dates and track completion independently per day.

---

## ✨ Key Feature Set

- 🧩 **Modular Topic Cards**: Group chores, checklists, and project tasks into customizable visual cards.
- 🗓️ **Drag-and-Drop Temporal Grid**: A responsive, high-performance calendar grid designed for seamless drag-and-drop scheduling from cards to time slots.
- 🔄 **Multi-Instance Scheduling**: Drag a single item (e.g., "Gym" or "Water Plants") onto multiple calendar slots. Each instance is tracked and checked off independently.
- ⚡ **Bi-Directional Task Sync**: Integrates with Google Tasks and Microsoft To-Do, automatically marking tasks as complete on third-party services.
- 🤖 **Contextual AI Suggestions**: Prompt the assistant for inspiration (e.g., "Suggest 5 routines for a productive morning") and instantly create scheduled cards.
- 🗓️ **Google Calendar Integration**: Sync and view your standard Google Calendar events on the same unified grid.
- 🧊 **Midnight Glass UI**: A beautiful, modern interface featuring frosted glass effects, vibrant gradients, and smooth animations.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Angular 19+
- **Styling**: Vanilla CSS with Glassmorphism principles
- **State Management**: Service-based architecture with RxJS
- **Interactions**: Angular CDK Drag and Drop
- **Auth**: Google One Tap / ID Token Validation

### Backend
- **Core**: .NET 10 Minimal APIs
- **ORM**: Entity Framework Core
- **Database**: SQLite
- **Security**: JWT-based authentication & Google Token Validation

---

## 🏗️ Architecture

Schedulist follows a strict **Smart/Dumb Component** architecture:
- **Dumb Components**: Focused purely on UI/UX, receiving data via `@Input()` and emitting events via `@Output()`.
- **Smart Components**: Handle domain logic, interact with services, and manage state.
- **Services**: All business logic and API interactions are encapsulated in Angular `@Injectable` classes.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Angular CLI](https://angular.io/cli)

### Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LasseAndresen/LifePlanner.git
   cd LifePlanner
   ```

2. **Backend Setup**
   ```bash
   cd server
   dotnet restore
   dotnet ef database update
   dotnet run
   ```

3. **Frontend Setup**
   ```bash
   cd client
   npm install
   ng serve
   ```

4. **Launch**
   Open your browser at `http://localhost:4200` to start planning.

---

## 🚀 Production Readiness

For details on preparing the application for production deployment, including database migration, secrets handling, security headers, performance optimizations, and CI/CD pipelines, see the [Production Checklist](file:///c:/Users/Waluda/Personal%20projects/LifePlanner/docs/production-checklist.md).

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by Lasse Andresen
</p>
