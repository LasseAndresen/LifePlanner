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
                var otherMembers = await db.WorkspaceUsers
                    .Where(other => other.WorkspaceId == wu.WorkspaceId && other.UserId != id)
                    .ToListAsync();

                if (otherMembers.Count == 0)
                {
                    // No other members, so delete the workspace and cascade all its cards, categories, schedules
                    var workspace = await db.Workspaces.FindAsync(wu.WorkspaceId);
                    if (workspace != null)
                    {
                        db.Workspaces.Remove(workspace);
                    }
                }
                else
                {
                    // Shared workspace.
                    // Determine the target user to transfer data and potentially ownership to.
                    WorkspaceUser targetMember;
                    if (wu.Role == "Owner")
                    {
                        // Promote another member to Owner
                        var existingOwner = otherMembers.FirstOrDefault(m => m.Role == "Owner");
                        if (existingOwner != null)
                        {
                            targetMember = existingOwner;
                        }
                        else
                        {
                            targetMember = otherMembers.First();
                            targetMember.Role = "Owner";
                        }
                    }
                    else
                    {
                        // User deleting data was a Member. Reassign data to the Owner, or first other member
                        targetMember = otherMembers.FirstOrDefault(m => m.Role == "Owner") ?? otherMembers.First();
                    }

                    var targetUserId = targetMember.UserId;

                    // Reassign all cards in this workspace belonging to the deleted user
                    var cardsToUpdate = await db.Cards
                        .Where(c => c.WorkspaceId == wu.WorkspaceId && c.UserId == id)
                        .ToListAsync();
                    foreach (var card in cardsToUpdate)
                    {
                        card.UserId = targetUserId;
                    }

                    // Get IDs of all categories used by cards in this shared workspace
                    var categoryIdsInCards = await db.Cards
                        .Where(c => c.WorkspaceId == wu.WorkspaceId)
                        .Select(c => c.CategoryId)
                        .Distinct()
                        .ToListAsync();

                    // Reassign all categories belonging to the deleted user that are either:
                    // - Part of this workspace
                    // - Referenced by any cards in this workspace
                    var categoriesToUpdate = await db.Categories
                        .Where(cat => cat.UserId == id && 
                               (cat.WorkspaceId == wu.WorkspaceId || categoryIdsInCards.Contains(cat.Id)))
                        .ToListAsync();
                    foreach (var cat in categoriesToUpdate)
                    {
                        cat.UserId = targetUserId;
                    }

                    // Reassign all scheduled instances in this workspace belonging to the deleted user
                    var instancesToUpdate = await db.ScheduledInstances
                        .Where(si => si.WorkspaceId == wu.WorkspaceId && si.UserId == id)
                        .ToListAsync();
                    foreach (var inst in instancesToUpdate)
                    {
                        inst.UserId = targetUserId;
                    }

                    // Remove the user's membership to the shared workspace
                    db.WorkspaceUsers.Remove(wu);
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
