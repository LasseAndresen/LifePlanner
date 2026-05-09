# Architecture & Tech Stack

## Chosen Stack
Based on the project requirements, business case, and adherence to SOLID principles:

*   **Frontend:** Angular (SPA)
*   **Backend:** .NET Web API
*   **Database:** PostgreSQL (or SQL Server)

## Rationale

1.  **Frontend (Angular):** 
    *   Highly structured, opinionated framework ideal for complex state management (like drag-and-drop interactions).
    *   Domain logic can be neatly isolated in `@Injectable()` services.
    *   UI components can remain "dumb" and strictly presentational.
2.  **Backend (.NET Web API):** 
    *   Provides a highly secure, robust environment for managing third-party API keys (Google Calendar, Microsoft TODO, OpenAI).
    *   Strongly typed and enforces SOLID principles.
    *   Handles complex scheduling logic, recurrence rules, and data synchronization without polluting the frontend.
3.  **Database (Relational):** 
    *   Calendar events, user permissions, and categorizations are inherently relational data.
    *   Provides strong consistency and integrity compared to a Document/NoSQL alternative.

## High-Level Data Flow
1.  **Client:** The Angular app renders the UI and captures drag-and-drop actions.
2.  **API Gateway:** The .NET backend receives actions, validates them, and processes the domain logic.
3.  **Third-Party Sync:** The .NET backend securely communicates with the Google Calendar API or OpenAI API as needed.
4.  **Storage:** The .NET backend persists the state (custom cards, routines, user profiles) to the SQL database.
