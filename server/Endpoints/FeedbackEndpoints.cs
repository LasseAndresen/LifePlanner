using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;

namespace LifePlanner.Api.Endpoints;

public static class FeedbackEndpoints
{
    public static void MapFeedbackEndpoints(this IEndpointRouteBuilder app)
    {
        // 1. Submit feedback (Accessible by any user)
        app.MapPost("/api/feedback", async (Feedback feedback, LifePlannerDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(feedback.Type) ||
                string.IsNullOrWhiteSpace(feedback.Title) ||
                string.IsNullOrWhiteSpace(feedback.Description))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Feedback", new[] { "Type, Title, and Description are required." } }
                });
            }

            feedback.CreatedAt = DateTime.UtcNow;
            feedback.Status = "New";
            feedback.AdminNotes = null;

            db.Feedback.Add(feedback);
            await db.SaveChangesAsync();

            return Results.Created($"/api/feedback/{feedback.Id}", feedback);
        }).WithTags("Feedback");

        // Helper to check if a user is admin
        async Task<bool> IsUserAdmin(int userId, IUserRepository userRepo)
        {
            var user = await userRepo.GetByIdAsync(userId);
            return user != null && user.IsAdmin;
        }

        // 2. Get all feedback (Admin only)
        app.MapGet("/api/admin/feedback", async (int adminUserId, LifePlannerDbContext db, IUserRepository userRepo) =>
        {
            if (!await IsUserAdmin(adminUserId, userRepo))
            {
                return Results.Json(new { error = "Unauthorized: Only administrators can view feedback." }, statusCode: 403);
            }

            var feedbackList = await db.Feedback
                .Include(f => f.User)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            return Results.Ok(feedbackList);
        }).WithTags("Admin");

        // 3. Update feedback status/notes (Admin only)
        app.MapPut("/api/admin/feedback/{id:int}", async (int id, int adminUserId, Feedback updatedFeedback, LifePlannerDbContext db, IUserRepository userRepo) =>
        {
            if (!await IsUserAdmin(adminUserId, userRepo))
            {
                return Results.Json(new { error = "Unauthorized: Only administrators can modify feedback." }, statusCode: 403);
            }

            var fb = await db.Feedback.FindAsync(id);
            if (fb is null) return Results.NotFound();

            fb.Status = updatedFeedback.Status;
            fb.AdminNotes = updatedFeedback.AdminNotes;

            await db.SaveChangesAsync();
            return Results.Ok(fb);
        }).WithTags("Admin");

        // 4. Retrieve query-based stats (Admin only)
        app.MapGet("/api/admin/stats", async (int adminUserId, LifePlannerDbContext db, IUserRepository userRepo) =>
        {
            if (!await IsUserAdmin(adminUserId, userRepo))
            {
                return Results.Json(new { error = "Unauthorized: Only administrators can view statistics." }, statusCode: 403);
            }

            // Compute statistics in real-time
            var totalUsers = await db.Users.CountAsync();
            var totalCards = await db.Cards.CountAsync();
            var totalListItems = await db.ListItems.CountAsync();
            var totalScheduledInstances = await db.ScheduledInstances.CountAsync();

            // Category usage counts
            var categoryStats = await db.Categories
                .Select(c => new {
                    c.Name,
                    c.Color,
                    CardCount = db.Cards.Count(card => card.CategoryId == c.Id)
                })
                .ToListAsync();

            // Feedback counts grouped by Type
            var feedbackStats = await db.Feedback
                .GroupBy(f => f.Type)
                .Select(g => new {
                    Type = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            // Integrations statistics
            var microsoftTodoConnectedCount = await db.Users.CountAsync(u => u.MicrosoftTodoConnected);
            var googleTasksConnectedCount = await db.Users.CountAsync(u => u.GoogleTasksConnected);

            var stats = new
            {
                TotalUsers = totalUsers,
                TotalCards = totalCards,
                TotalListItems = totalListItems,
                TotalScheduledInstances = totalScheduledInstances,
                CategoryStats = categoryStats,
                FeedbackStats = feedbackStats,
                MicrosoftTodoConnectedCount = microsoftTodoConnectedCount,
                GoogleTasksConnectedCount = googleTasksConnectedCount
            };

            return Results.Ok(stats);
        }).WithTags("Admin");
    }
}
