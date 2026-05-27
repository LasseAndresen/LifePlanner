using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;

namespace LifePlanner.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(user.Name) || string.IsNullOrWhiteSpace(user.Email))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "User", new[] { "Name and Email are required." } }
                });
            }

            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });

        group.MapDelete("/{id:int}", async (int id, LifePlannerDbContext db) =>
        {
            // 1. Find all workspace memberships for this user
            var memberships = await db.WorkspaceUsers
                .Where(wu => wu.UserId == id)
                .ToListAsync();

            foreach (var wu in memberships)
            {
                // Check if anyone else belongs to this workspace
                var otherMembersCount = await db.WorkspaceUsers
                    .CountAsync(other => other.WorkspaceId == wu.WorkspaceId && other.UserId != id);

                if (otherMembersCount == 0)
                {
                    // No other members, so delete the workspace and cascade all its cards, categories, schedules
                    var workspace = await db.Workspaces.FindAsync(wu.WorkspaceId);
                    if (workspace != null)
                    {
                        db.Workspaces.Remove(workspace);
                    }
                }
            }

            // 2. Remove feedback linked to this user
            var feedbacks = await db.Feedback.Where(f => f.UserId == id).ToListAsync();
            db.Feedback.RemoveRange(feedbacks);

            // 3. Find and remove the user
            var user = await db.Users.FindAsync(id);
            if (user == null)
            {
                return Results.NotFound();
            }

            db.Users.Remove(user);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });
    }
}
