using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public class WorkspaceService : IWorkspaceService
{
    private readonly LifePlannerDbContext _db;
    private readonly IConfiguration _configuration;

    public WorkspaceService(LifePlannerDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<IEnumerable<WorkspaceDto>> GetWorkspacesByUserIdAsync(int userId)
    {
        var userWorkspaces = await _db.WorkspaceUsers
            .Include(wu => wu.Workspace!)
                .ThenInclude(w => w.WorkspaceUsers)
                    .ThenInclude(wu => wu.User)
            .Where(wu => wu.UserId == userId)
            .ToListAsync();

        if (userWorkspaces.Count == 0)
        {
            var userExists = await _db.Users.AnyAsync(u => u.Id == userId);
            if (userExists)
            {
                var workspace = new Workspace { Name = "Personal Workspace" };
                _db.Workspaces.Add(workspace);
                await _db.SaveChangesAsync();

                var workspaceUser = new WorkspaceUser
                {
                    WorkspaceId = workspace.Id,
                    UserId = userId,
                    Role = "Owner"
                };
                _db.WorkspaceUsers.Add(workspaceUser);

                await SeedDefaultCategoriesAsync(workspace.Id, userId);

                // Reload the workspaces list
                userWorkspaces = await _db.WorkspaceUsers
                    .Include(wu => wu.Workspace!)
                        .ThenInclude(w => w.WorkspaceUsers)
                            .ThenInclude(wu => wu.User)
                    .Where(wu => wu.UserId == userId)
                    .ToListAsync();
            }
        }

        return userWorkspaces.Select(wu => new WorkspaceDto
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
    }

    public async Task<WorkspaceDto> CreateWorkspaceAsync(CreateWorkspaceRequest request)
    {
        var workspace = new Workspace { Name = request.Name };
        _db.Workspaces.Add(workspace);
        await _db.SaveChangesAsync();

        var workspaceUser = new WorkspaceUser
        {
            WorkspaceId = workspace.Id,
            UserId = request.UserId,
            Role = "Owner"
        };
        _db.WorkspaceUsers.Add(workspaceUser);

        await SeedDefaultCategoriesAsync(workspace.Id, request.UserId);

        var responseDto = new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Role = "Owner",
            Members = new List<WorkspaceMemberDto>
            {
                new() { Id = request.UserId, Role = "Owner" }
            }
        };

        return responseDto;
    }

    public async Task<WorkspaceMemberDto?> InviteUserAsync(int workspaceId, InviteUserRequest request)
    {
        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (targetUser == null)
        {
            return null;
        }

        var isAlreadyMember = await _db.WorkspaceUsers.AnyAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == targetUser.Id);
        if (isAlreadyMember)
        {
            throw new InvalidOperationException("User is already a member of this workspace.");
        }

        var workspaceUser = new WorkspaceUser
        {
            WorkspaceId = workspaceId,
            UserId = targetUser.Id,
            Role = "Member"
        };

        _db.WorkspaceUsers.Add(workspaceUser);
        await _db.SaveChangesAsync();

        return new WorkspaceMemberDto
        {
            Id = targetUser.Id,
            Name = targetUser.Name,
            Email = targetUser.Email,
            Role = "Member"
        };
    }

    public async Task<bool> RemoveMemberAsync(int workspaceId, int userId, int? requesterId)
    {
        var membership = await _db.WorkspaceUsers.FirstOrDefaultAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == userId);
        if (membership == null)
        {
            return false;
        }

        if (requesterId.HasValue && requesterId.Value != userId)
        {
            // The requester is trying to remove someone else. Verify requester is Owner.
            var requesterMembership = await _db.WorkspaceUsers
                .FirstOrDefaultAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == requesterId.Value);

            if (requesterMembership == null || requesterMembership.Role != "Owner")
            {
                throw new UnauthorizedAccessException("Only workspace owners can remove other members.");
            }
        }

        _db.WorkspaceUsers.Remove(membership);

        // Clean up workspace if last member leaves
        var otherMembersCount = await _db.WorkspaceUsers.CountAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId != userId);
        if (otherMembersCount == 0)
        {
            var workspace = await _db.Workspaces.FindAsync(workspaceId);
            if (workspace != null)
            {
                _db.Workspaces.Remove(workspace);
            }
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<string?> GetInviteTokenAsync(int workspaceId)
    {
        var workspace = await _db.Workspaces.FindAsync(workspaceId);
        if (workspace == null)
        {
            return null;
        }

        if (string.IsNullOrEmpty(workspace.InviteToken))
        {
            workspace.InviteToken = Guid.NewGuid().ToString("N");
            await _db.SaveChangesAsync();
        }

        return workspace.InviteToken;
    }

    public async Task<WorkspaceDto?> JoinWorkspaceAsync(JoinWorkspaceRequest request)
    {
        var workspace = await _db.Workspaces.FirstOrDefaultAsync(w => w.InviteToken == request.Token);
        if (workspace == null)
        {
            return null;
        }

        var isAlreadyMember = await _db.WorkspaceUsers
            .AnyAsync(wu => wu.WorkspaceId == workspace.Id && wu.UserId == request.UserId);

        if (!isAlreadyMember)
        {
            var workspaceUser = new WorkspaceUser
            {
                WorkspaceId = workspace.Id,
                UserId = request.UserId,
                Role = "Member"
            };
            _db.WorkspaceUsers.Add(workspaceUser);
            await _db.SaveChangesAsync();
        }

        return new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Role = "Member",
            Members = await _db.WorkspaceUsers
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
    }

    public async Task<bool> TransferOwnershipAsync(int workspaceId, TransferOwnershipRequest request)
    {
        // Verify requester is currently the Owner
        var requesterMembership = await _db.WorkspaceUsers
            .FirstOrDefaultAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == request.RequesterId);

        if (requesterMembership == null || requesterMembership.Role != "Owner")
        {
            throw new UnauthorizedAccessException("Only the workspace owner can transfer ownership.");
        }

        // Verify target user is member
        var newOwnerMembership = await _db.WorkspaceUsers
            .FirstOrDefaultAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == request.NewOwnerId);

        if (newOwnerMembership == null)
        {
            throw new InvalidOperationException("The target user is not a member of this workspace.");
        }

        requesterMembership.Role = "Member";
        newOwnerMembership.Role = "Owner";

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<WorkspaceDto?> RenameWorkspaceAsync(int workspaceId, RenameWorkspaceRequest request)
    {
        var workspace = await _db.Workspaces
            .Include(w => w.WorkspaceUsers)
                .ThenInclude(wu => wu.User)
            .FirstOrDefaultAsync(w => w.Id == workspaceId);

        if (workspace == null)
        {
            return null;
        }

        var requesterMembership = workspace.WorkspaceUsers
            .FirstOrDefault(wu => wu.UserId == request.RequesterId);

        if (requesterMembership == null || requesterMembership.Role != "Owner")
        {
            throw new UnauthorizedAccessException("Only the workspace owner can rename the workspace.");
        }

        workspace.Name = request.Name;
        await _db.SaveChangesAsync();

        return new WorkspaceDto
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Role = requesterMembership.Role,
            Members = workspace.WorkspaceUsers.Select(member => new WorkspaceMemberDto
            {
                Id = member.User!.Id,
                Name = member.User.Name,
                Email = member.User.Email,
                Role = member.Role
            }).ToList()
        };
    }

    private async Task SeedDefaultCategoriesAsync(int workspaceId, int userId)
    {
        var categoriesSection = _configuration.GetSection("WorkspaceSettings:DefaultCategories").Get<List<CategoryConfig>>();
        if (categoriesSection == null || categoriesSection.Count == 0)
        {
            categoriesSection = new List<CategoryConfig>
            {
                new() { Name = "Ideas",    Color = "#3b82f6" },
                new() { Name = "Chores",   Color = "#10b981" },
                new() { Name = "Events",   Color = "#f59e0b" },
                new() { Name = "Personal", Color = "#ec4899" }
            };
        }

        var categories = categoriesSection.Select(c => new Category
        {
            Name = c.Name,
            Color = c.Color,
            WorkspaceId = workspaceId,
            UserId = userId
        });

        _db.Categories.AddRange(categories);
        await _db.SaveChangesAsync();
    }

    private class CategoryConfig
    {
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
    }
}
