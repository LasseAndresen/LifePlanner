using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Endpoints;

public static class WorkspaceEndpoints
{
    public static void MapWorkspaceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/workspaces").WithTags("Workspaces");

        // GET /api/workspaces/user/{userId}
        app.MapGet("/api/workspaces/user/{userId:int}", async (int userId, LifePlannerDbContext db) =>
        {
            var userWorkspaces = await db.WorkspaceUsers
                .Include(wu => wu.Workspace!)
                    .ThenInclude(w => w.WorkspaceUsers)
                        .ThenInclude(wu => wu.User)
                .Where(wu => wu.UserId == userId)
                .ToListAsync();

            if (userWorkspaces.Count == 0)
            {
                // Verify the user exists before creating a workspace
                var userExists = await db.Users.AnyAsync(u => u.Id == userId);
                if (userExists)
                {
                    var workspace = new Workspace { Name = "Personal Workspace" };
                    db.Workspaces.Add(workspace);
                    await db.SaveChangesAsync();

                    var workspaceUser = new WorkspaceUser
                    {
                        WorkspaceId = workspace.Id,
                        UserId = userId,
                        Role = "Owner"
                    };
                    db.WorkspaceUsers.Add(workspaceUser);

                    // Seed default categories inside this workspace
                    db.Categories.AddRange(new[]
                    {
                        new Category { Name = "Ideas",    Color = "#3b82f6", WorkspaceId = workspace.Id, UserId = userId },
                        new Category { Name = "Chores",   Color = "#10b981", WorkspaceId = workspace.Id, UserId = userId },
                        new Category { Name = "Events",   Color = "#f59e0b", WorkspaceId = workspace.Id, UserId = userId },
                        new Category { Name = "Personal", Color = "#ec4899", WorkspaceId = workspace.Id, UserId = userId }
                    });

                    await db.SaveChangesAsync();

                    // Reload the workspaces list
                    userWorkspaces = await db.WorkspaceUsers
                        .Include(wu => wu.Workspace!)
                            .ThenInclude(w => w.WorkspaceUsers)
                                .ThenInclude(wu => wu.User)
                        .Where(wu => wu.UserId == userId)
                        .ToListAsync();
                }
            }

            var result = userWorkspaces.Select(wu => new WorkspaceDto
            {
                Id = wu.Workspace!.Id,
                Name = wu.Workspace.Name,
                Role = wu.Role,
                Members = wu.Workspace.WorkspaceUsers.Select(member => new WorkspaceMemberDto
                {
                    Id = member.User!.Id,
                    Name = member.User.Name,
                    Email = member.User.Email,
                    Role = member.Role
                }).ToList()
            });

            return Results.Ok(result);
        });

        // POST /api/workspaces
        group.MapPost("/", async (CreateWorkspaceRequest request, LifePlannerDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.UserId <= 0)
            {
                return Results.BadRequest("Invalid workspace name or user ID.");
            }

            var workspace = new Workspace { Name = request.Name };
            db.Workspaces.Add(workspace);
            await db.SaveChangesAsync();

            var workspaceUser = new WorkspaceUser
            {
                WorkspaceId = workspace.Id,
                UserId = request.UserId,
                Role = "Owner"
            };
            db.WorkspaceUsers.Add(workspaceUser);

            // Seed default categories for this workspace
            db.Categories.AddRange(new[]
            {
                new Category { Name = "Ideas",    Color = "#3b82f6", WorkspaceId = workspace.Id, UserId = request.UserId },
                new Category { Name = "Chores",   Color = "#10b981", WorkspaceId = workspace.Id, UserId = request.UserId },
                new Category { Name = "Events",   Color = "#f59e0b", WorkspaceId = workspace.Id, UserId = request.UserId },
                new Category { Name = "Personal", Color = "#ec4899", WorkspaceId = workspace.Id, UserId = request.UserId }
            });

            await db.SaveChangesAsync();

            var responseDto = new WorkspaceDto
            {
                Id = workspace.Id,
                Name = workspace.Name,
                Role = "Owner",
                Members = new List<WorkspaceMemberDto>
                {
                    new() { Id = request.UserId, Role = "Owner" } // Basic info populated for immediate UI
                }
            };

            return Results.Created($"/api/workspaces/{workspace.Id}", responseDto);
        });

        // POST /api/workspaces/{workspaceId}/invite
        group.MapPost("/{workspaceId:int}/invite", async (int workspaceId, InviteUserRequest request, LifePlannerDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return Results.BadRequest("Email is required.");
            }

            var targetUser = await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (targetUser == null)
            {
                return Results.NotFound(new { detail = $"User with email '{request.Email}' not found." });
            }

            var isAlreadyMember = await db.WorkspaceUsers.AnyAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == targetUser.Id);
            if (isAlreadyMember)
            {
                return Results.BadRequest(new { detail = "User is already a member of this workspace." });
            }

            var workspaceUser = new WorkspaceUser
            {
                WorkspaceId = workspaceId,
                UserId = targetUser.Id,
                Role = "Member"
            };

            db.WorkspaceUsers.Add(workspaceUser);
            await db.SaveChangesAsync();

            return Results.Ok(new WorkspaceMemberDto
            {
                Id = targetUser.Id,
                Name = targetUser.Name,
                Email = targetUser.Email,
                Role = "Member"
            });
        });

        // DELETE /api/workspaces/{workspaceId}/users/{userId}
        group.MapDelete("/{workspaceId:int}/users/{userId:int}", async (int workspaceId, int userId, int? requesterId, LifePlannerDbContext db) =>
        {
            var membership = await db.WorkspaceUsers.FirstOrDefaultAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == userId);
            if (membership == null)
            {
                return Results.NotFound("Membership not found.");
            }

            if (requesterId.HasValue && requesterId.Value != userId)
            {
                // The requester is trying to remove someone else.
                // Verify the requester is an Owner of the workspace.
                var requesterMembership = await db.WorkspaceUsers
                    .FirstOrDefaultAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == requesterId.Value);

                if (requesterMembership == null || requesterMembership.Role != "Owner")
                {
                    return Results.BadRequest(new { detail = "Only workspace owners can remove other members." });
                }
            }

            db.WorkspaceUsers.Remove(membership);

            // Clean up workspace if last member leaves
            var otherMembersCount = await db.WorkspaceUsers.CountAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId != userId);
            if (otherMembersCount == 0)
            {
                var workspace = await db.Workspaces.FindAsync(workspaceId);
                if (workspace != null)
                {
                    db.Workspaces.Remove(workspace);
                }
            }

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // POST /api/workspaces/{workspaceId}/invite-token
        group.MapPost("/{workspaceId:int}/invite-token", async (int workspaceId, LifePlannerDbContext db) =>
        {
            var workspace = await db.Workspaces.FindAsync(workspaceId);
            if (workspace == null)
            {
                return Results.NotFound("Workspace not found.");
            }

            if (string.IsNullOrEmpty(workspace.InviteToken))
            {
                workspace.InviteToken = Guid.NewGuid().ToString("N");
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { inviteToken = workspace.InviteToken });
        });

        // POST /api/workspaces/join
        group.MapPost("/join", async (JoinWorkspaceRequest request, LifePlannerDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Token) || request.UserId <= 0)
            {
                return Results.BadRequest("Token and UserId are required.");
            }

            var workspace = await db.Workspaces.FirstOrDefaultAsync(w => w.InviteToken == request.Token);
            if (workspace == null)
            {
                return Results.NotFound(new { detail = "Invalid invite link or workspace not found." });
            }

            var isAlreadyMember = await db.WorkspaceUsers
                .AnyAsync(wu => wu.WorkspaceId == workspace.Id && wu.UserId == request.UserId);

            if (!isAlreadyMember)
            {
                var workspaceUser = new WorkspaceUser
                {
                    WorkspaceId = workspace.Id,
                    UserId = request.UserId,
                    Role = "Member"
                };
                db.WorkspaceUsers.Add(workspaceUser);
                await db.SaveChangesAsync();
            }

            // Return the workspace detail
            var workspaceDto = new WorkspaceDto
            {
                Id = workspace.Id,
                Name = workspace.Name,
                Role = "Member",
                Members = await db.WorkspaceUsers
                    .Include(wu => wu.User)
                    .Where(wu => wu.WorkspaceId == workspace.Id)
                    .Select(wu => new WorkspaceMemberDto
                    {
                        Id = wu.User!.Id,
                        Name = wu.User.Name,
                        Email = wu.User.Email,
                        Role = wu.Role
                    }).ToListAsync()
            };

            return Results.Ok(workspaceDto);
        });
    }
}

public class WorkspaceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<WorkspaceMemberDto> Members { get; set; } = new();
}

public class WorkspaceMemberDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public record CreateWorkspaceRequest(string Name, int UserId);
public record InviteUserRequest(string Email);
public record JoinWorkspaceRequest(string Token, int UserId);
