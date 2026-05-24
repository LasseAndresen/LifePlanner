# Features and Roadmap

## Phase 1: Minimum Viable Product (MVP)
The MVP focuses on establishing the core "drag-and-drop" loop between cards and the temporal calendar for a single user.

*   **Google Login & Auth:** Mandatory Google authentication to access Calendar APIs.
*   **Custom Calendar UI Grid:** A simple, custom-built calendar view (e.g., Day/Week) that supports drag-and-drop interactions.
*   **Calendar Instance Editor (CRUD UI):** A dedicated dialog/form for adding, editing, or deleting scheduled items directly on the calendar grid. Allows mapping calendar-specific details like event type, custom descriptions, and specific start/end times (ensuring the system is future-proofed for fine-grained hourly scheduling instead of only whole-day slots).
*   **Google Calendar Integration:** Syncing to read and update standard calendar events to our custom grid.
*   **Topic Cards & Action Items:** Topic cards act as project or idea containers holding actionable tasks and checklists (`ListItem`s).
*   **Granular Multi-Instance Scheduling:** The core interaction; dragging task items from topic cards onto the custom calendar grid creates independent scheduled instances. A single task item can be scheduled across multiple dates and completed independently on each scheduled day.
*   **Manual Entry & Inline Editing:** Complete CRUD operations for cards, categories, and list items with intuitive inline text editing.

## Phase 2: Enhancements & Integrations (Should Have)
Introducing AI, enhanced write integrations, and multi-view navigation interfaces.

*   **AI Inspiration:** Generate lists of ideas for events or activities via simple prompts (e.g., "Give me 5 ideas for a cheap date night").
*   **Microsoft TODO Integration:** Sync tasks from Microsoft To-Do. Supports bi-directional write capabilities: completing a task inside LifePlanner automatically marks it as completed in Microsoft To-Do.
*   **Google Tasks Integration:** Sync tasks from Google Tasks. Completing a task inside LifePlanner automatically marks it as completed in Google Tasks.
*   **Google Keep Integration:** Select specific Google Keep notes to import as dedicated, read-only cards in the sidebar. Keeps checklist items intact for calendar scheduling.
*   **Teams-like Navigation Sidebar:** A collapsible, high-fidelity sidebar (similar to Microsoft Teams) to toggle seamlessly between pages (e.g., Planner Calendar, Whiteboard, Integrations, and Settings).
*   **Whiteboard (Google Keep-style Card Board):** A dedicated board page displaying all planning cards on a canvas. Cards are freely movable and use non-overlapping placement rules to maintain organization.
*   **Routine Templates:** Save a collection of cards as a "Routine" that can be scheduled recursively or in bulk.

## Phase 3: Advanced Automation & Multiplayer (Could Have)
Reducing friction through advanced AI capabilities, multi-state events, and enabling shared planning.

*   **Natural Language Entry:** "Remind me to call Mom on Sunday" automatically creates and schedules a card.
*   **Proactive AI Recommendations:** The app automatically surfaces relevant cards based on available calendar white-space and past habits.
*   **Draft & Confirmed Calendar States:** Support scheduling cards with multiple states (e.g., `Draft` vs. `Confirmed`). Scheduled items remain as drafts within LifePlanner and are only written/committed to the user's external Google Calendar once they are explicitly marked as `Confirmed`.
*   **External Integration Ecosystem (Inspiration):**
    *   *Notion Sync:* Import database boards or checklists as read-only planning cards.
    *   *GitHub Issues:* Select assigned repositories to pull issues/PRs into cards for developer-focused planning.
    *   *Slack Saved Items:* Automatically sync saved/flagged messages as action items.
    *   *Habitica Sync:* Connect Habitica to reward calendar event completions with RPG experience points.
*   **Shopping List Integration:** Either a native feature or integration with external shopping list APIs.
*   **Multiplayer / Shared Boards:** Allowing couples and families to share boards, add ideas collaboratively, and sync to shared calendars.
*   **Event Proposals (Draft State):** Mark events as "Draft" to ask for a partner's approval or input before confirming it on the shared calendar.
