using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Xunit;

namespace LifePlanner.Api.Tests;

public class test_UserDeletion : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<LifePlannerDbContext> _options;

    public test_UserDeletion()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<LifePlannerDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = new LifePlannerDbContext(_options);
        context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }

    private async Task DeleteUserLogicAsync(LifePlannerDbContext db, int id)
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
        if (user != null)
        {
            db.Users.Remove(user);
        }
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task DeleteUser_ShouldDeleteSingleUserWorkspaceAndCascadeData_WhenUserIsOnlyMember()
    {
        // Arrange
        using var context = new LifePlannerDbContext(_options);
        var user = new User { Id = 1, Name = "User A", Email = "a@example.com" };
        var workspace = new Workspace { Id = 10, Name = "Personal WS" };
        var wu = new WorkspaceUser { Id = 100, WorkspaceId = 10, UserId = 1, Role = "Owner" };

        var category = new Category { Id = 20, Name = "Chores", Color = "#000", WorkspaceId = 10, UserId = 1 };
        var card = new Card { Id = 30, Title = "Clean room", CategoryId = 20, WorkspaceId = 10, UserId = 1 };
        var scheduledInstance = new ScheduledInstance { Id = 40, Date = DateTime.UtcNow, UserId = 1, WorkspaceId = 10 };

        await context.Users.AddAsync(user);
        await context.Workspaces.AddAsync(workspace);
        await context.WorkspaceUsers.AddAsync(wu);
        await context.Categories.AddAsync(category);
        await context.Cards.AddAsync(card);
        await context.ScheduledInstances.AddAsync(scheduledInstance);
        await context.SaveChangesAsync();

        // Act
        await DeleteUserLogicAsync(context, 1);

        // Assert
        using var assertContext = new LifePlannerDbContext(_options);
        Assert.Null(await assertContext.Users.FindAsync(1));
        Assert.Null(await assertContext.Workspaces.FindAsync(10));
        Assert.Null(await assertContext.WorkspaceUsers.FindAsync(100));
        Assert.Null(await assertContext.Categories.FindAsync(20));
        Assert.Null(await assertContext.Cards.FindAsync(30));
        Assert.Null(await assertContext.ScheduledInstances.FindAsync(40));
    }

    [Fact]
    public async Task DeleteUser_ShouldTransferOwnershipAndReassignData_WhenUserIsOwnerInSharedWorkspace()
    {
        // Arrange
        using var context = new LifePlannerDbContext(_options);
        var userA = new User { Id = 1, Name = "User A", Email = "a@example.com" };
        var userB = new User { Id = 2, Name = "User B", Email = "b@example.com" };
        var workspace = new Workspace { Id = 10, Name = "Shared WS" };
        
        var wuA = new WorkspaceUser { Id = 100, WorkspaceId = 10, UserId = 1, Role = "Owner" };
        var wuB = new WorkspaceUser { Id = 101, WorkspaceId = 10, UserId = 2, Role = "Member" };

        var category = new Category { Id = 20, Name = "Chores", Color = "#000", WorkspaceId = null, UserId = 1 };
        var card = new Card { Id = 30, Title = "Clean room", CategoryId = 20, WorkspaceId = 10, UserId = 1 };
        var scheduledInstance = new ScheduledInstance { Id = 40, Date = DateTime.UtcNow, UserId = 1, WorkspaceId = 10 };

        await context.Users.AddRangeAsync(userA, userB);
        await context.Workspaces.AddAsync(workspace);
        await context.WorkspaceUsers.AddRangeAsync(wuA, wuB);
        await context.Categories.AddAsync(category);
        await context.Cards.AddAsync(card);
        await context.ScheduledInstances.AddAsync(scheduledInstance);
        await context.SaveChangesAsync();

        // Act
        await DeleteUserLogicAsync(context, 1);

        // Assert
        using var assertContext = new LifePlannerDbContext(_options);
        
        // User A and their workspace membership should be deleted
        Assert.Null(await assertContext.Users.FindAsync(1));
        Assert.Null(await assertContext.WorkspaceUsers.FindAsync(100));

        // Workspace and User B should remain
        Assert.NotNull(await assertContext.Workspaces.FindAsync(10));
        var remainingMember = await assertContext.WorkspaceUsers.FindAsync(101);
        Assert.NotNull(remainingMember);
        Assert.Equal("Owner", remainingMember.Role); // Ownership transferred to User B

        // Data should remain, but reassigned to User B
        var reloadedCategory = await assertContext.Categories.FindAsync(20);
        Assert.NotNull(reloadedCategory);
        Assert.Equal(2, reloadedCategory.UserId);

        var reloadedCard = await assertContext.Cards.FindAsync(30);
        Assert.NotNull(reloadedCard);
        Assert.Equal(2, reloadedCard.UserId);

        var reloadedInstance = await assertContext.ScheduledInstances.FindAsync(40);
        Assert.NotNull(reloadedInstance);
        Assert.Equal(2, reloadedInstance.UserId);
    }

    [Fact]
    public async Task DeleteUser_ShouldReassignDataToExistingOwner_WhenUserIsMemberInSharedWorkspace()
    {
        // Arrange
        using var context = new LifePlannerDbContext(_options);
        var userA = new User { Id = 1, Name = "User A", Email = "a@example.com" };
        var userB = new User { Id = 2, Name = "User B", Email = "b@example.com" };
        var workspace = new Workspace { Id = 10, Name = "Shared WS" };
        
        var wuA = new WorkspaceUser { Id = 100, WorkspaceId = 10, UserId = 1, Role = "Member" };
        var wuB = new WorkspaceUser { Id = 101, WorkspaceId = 10, UserId = 2, Role = "Owner" };

        var category = new Category { Id = 20, Name = "Chores", Color = "#000", WorkspaceId = 10, UserId = 1 };
        var card = new Card { Id = 30, Title = "Clean room", CategoryId = 20, WorkspaceId = 10, UserId = 1 };
        var scheduledInstance = new ScheduledInstance { Id = 40, Date = DateTime.UtcNow, UserId = 1, WorkspaceId = 10 };

        await context.Users.AddRangeAsync(userA, userB);
        await context.Workspaces.AddAsync(workspace);
        await context.WorkspaceUsers.AddRangeAsync(wuA, wuB);
        await context.Categories.AddAsync(category);
        await context.Cards.AddAsync(card);
        await context.ScheduledInstances.AddAsync(scheduledInstance);
        await context.SaveChangesAsync();

        // Act
        await DeleteUserLogicAsync(context, 1);

        // Assert
        using var assertContext = new LifePlannerDbContext(_options);
        
        // User A and their workspace membership should be deleted
        Assert.Null(await assertContext.Users.FindAsync(1));
        Assert.Null(await assertContext.WorkspaceUsers.FindAsync(100));

        // Workspace and User B should remain
        Assert.NotNull(await assertContext.Workspaces.FindAsync(10));
        var remainingOwner = await assertContext.WorkspaceUsers.FindAsync(101);
        Assert.NotNull(remainingOwner);
        Assert.Equal("Owner", remainingOwner.Role); // Ownership remains with User B

        // Data should remain, but reassigned to User B
        var reloadedCategory = await assertContext.Categories.FindAsync(20);
        Assert.NotNull(reloadedCategory);
        Assert.Equal(2, reloadedCategory.UserId);

        var reloadedCard = await assertContext.Cards.FindAsync(30);
        Assert.NotNull(reloadedCard);
        Assert.Equal(2, reloadedCard.UserId);

        var reloadedInstance = await assertContext.ScheduledInstances.FindAsync(40);
        Assert.NotNull(reloadedInstance);
        Assert.Equal(2, reloadedInstance.UserId);
    }

    [Fact]
    public async Task DeleteUser_ShouldDeletePersonalDataAndFeedback()
    {
        // Arrange
        using var context = new LifePlannerDbContext(_options);
        var user = new User { Id = 1, Name = "User A", Email = "a@example.com" };
        var feedback = new Feedback { Id = 50, UserId = 1, Type = "Bug", Title = "Broken UI", Description = "Bug desc", Status = "New", CreatedAt = DateTime.UtcNow };

        await context.Users.AddAsync(user);
        await context.Feedback.AddAsync(feedback);
        await context.SaveChangesAsync();

        // Act
        await DeleteUserLogicAsync(context, 1);

        // Assert
        using var assertContext = new LifePlannerDbContext(_options);
        Assert.Null(await assertContext.Users.FindAsync(1));
        Assert.Null(await assertContext.Feedback.FindAsync(50));
    }
}
