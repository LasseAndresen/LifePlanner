using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Services;
using Xunit;

namespace LifePlanner.Api.Tests;

public class test_WorkspaceService
{
    private (LifePlannerDbContext context, IConfiguration configuration) SetupDependencies(Dictionary<string, string>? configData = null)
    {
        var options = new DbContextOptionsBuilder<LifePlannerDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new LifePlannerDbContext(options);

        configData ??= new Dictionary<string, string>();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        return (context, configuration);
    }

    [Fact]
    public async Task GetWorkspacesByUserIdAsync_ShouldReturnWorkspaces_WhenTheyExist()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        
        var user1 = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        var user2 = new User { Id = 2, Name = "Alice", Email = "alice@example.com" };
        await context.Users.AddRangeAsync(user1, user2);

        var ws1 = new Workspace { Id = 10, Name = "Workspace A" };
        await context.Workspaces.AddAsync(ws1);

        var wu1 = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        var wu2 = new WorkspaceUser { WorkspaceId = 10, UserId = 2, Role = "Member" };
        await context.WorkspaceUsers.AddRangeAsync(wu1, wu2);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);

        // Act
        var result = (await service.GetWorkspacesByUserIdAsync(1)).ToList();

        // Assert
        Assert.Single(result);
        var wsDto = result[0];
        Assert.Equal(10, wsDto.Id);
        Assert.Equal("Workspace A", wsDto.Name);
        Assert.Equal("Owner", wsDto.Role);
        Assert.Equal(2, wsDto.Members.Count);
        
        var owner = wsDto.Members.FirstOrDefault(m => m.Role == "Owner");
        var member = wsDto.Members.FirstOrDefault(m => m.Role == "Member");
        
        Assert.NotNull(owner);
        Assert.Equal(1, owner.Id);
        Assert.NotNull(member);
        Assert.Equal(2, member.Id);
    }

    [Fact]
    public async Task GetWorkspacesByUserIdAsync_ShouldAutoCreateWorkspaceAndSeedCategories_WhenNoneExist()
    {
        // Arrange
        var configData = new Dictionary<string, string>
        {
            { "WorkspaceSettings:DefaultCategories:0:Name", "ConfiguredWork" },
            { "WorkspaceSettings:DefaultCategories:0:Color", "#ff0000" }
        };
        var (context, configuration) = SetupDependencies(configData);

        var user = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);

        // Act
        var result = (await service.GetWorkspacesByUserIdAsync(1)).ToList();

        // Assert
        Assert.Single(result);
        var wsDto = result[0];
        Assert.Equal("Personal Workspace", wsDto.Name);
        Assert.Equal("Owner", wsDto.Role);

        // Verify category was seeded from configuration
        var seededCategories = await context.Categories.Where(c => c.WorkspaceId == wsDto.Id).ToListAsync();
        Assert.Single(seededCategories);
        Assert.Equal("ConfiguredWork", seededCategories[0].Name);
        Assert.Equal("#ff0000", seededCategories[0].Color);
    }

    [Fact]
    public async Task GetWorkspacesByUserIdAsync_ShouldFallbackToHardcodedCategories_WhenConfigSectionIsEmpty()
    {
        // Arrange
        var (context, configuration) = SetupDependencies(); // Empty configuration

        var user = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);

        // Act
        var result = (await service.GetWorkspacesByUserIdAsync(1)).ToList();

        // Assert
        Assert.Single(result);
        var wsDto = result[0];

        // Should seed 4 default categories (Ideas, Chores, Events, Personal)
        var seededCategories = await context.Categories.Where(c => c.WorkspaceId == wsDto.Id).ToListAsync();
        Assert.Equal(4, seededCategories.Count);
        Assert.Contains(seededCategories, c => c.Name == "Ideas");
        Assert.Contains(seededCategories, c => c.Name == "Chores");
    }

    [Fact]
    public async Task GetWorkspacesByUserIdAsync_ShouldReturnEmpty_WhenUserDoesNotExist()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var service = new WorkspaceService(context, configuration);

        // Act
        var result = await service.GetWorkspacesByUserIdAsync(999);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task CreateWorkspaceAsync_ShouldCreateAndSeedCategories()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var service = new WorkspaceService(context, configuration);

        var request = new CreateWorkspaceRequest("New Workspace", 1);

        // Act
        var result = await service.CreateWorkspaceAsync(request);

        // Assert
        Assert.Equal("New Workspace", result.Name);
        Assert.Equal("Owner", result.Role);

        var workspaceInDb = await context.Workspaces.FindAsync(result.Id);
        Assert.NotNull(workspaceInDb);
        Assert.Equal("New Workspace", workspaceInDb.Name);

        var membership = await context.WorkspaceUsers.FirstOrDefaultAsync(wu => wu.WorkspaceId == result.Id && wu.UserId == 1);
        Assert.NotNull(membership);
        Assert.Equal("Owner", membership.Role);

        // Assert categories seeded
        var categoriesCount = await context.Categories.CountAsync(c => c.WorkspaceId == result.Id);
        Assert.Equal(4, categoriesCount);
    }

    [Fact]
    public async Task InviteUserAsync_ShouldAddUserAsMember_WhenUserExists()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        
        var owner = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        var invitee = new User { Id = 2, Name = "Alice", Email = "alice@example.com" };
        await context.Users.AddRangeAsync(owner, invitee);

        var ws = new Workspace { Id = 10, Name = "Workspace A" };
        await context.Workspaces.AddAsync(ws);

        var wu = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        await context.WorkspaceUsers.AddAsync(wu);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new InviteUserRequest("alice@example.com");

        // Act
        var result = await service.InviteUserAsync(10, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Id);
        Assert.Equal("Alice", result.Name);
        Assert.Equal("Member", result.Role);

        var membership = await context.WorkspaceUsers.FirstOrDefaultAsync(w => w.WorkspaceId == 10 && w.UserId == 2);
        Assert.NotNull(membership);
        Assert.Equal("Member", membership.Role);
    }

    [Fact]
    public async Task InviteUserAsync_ShouldReturnNull_WhenUserDoesNotExist()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var ws = new Workspace { Id = 10, Name = "Workspace A" };
        await context.Workspaces.AddAsync(ws);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new InviteUserRequest("nobody@example.com");

        // Act
        var result = await service.InviteUserAsync(10, request);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task InviteUserAsync_ShouldThrow_WhenUserIsAlreadyMember()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        
        var owner = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        await context.Users.AddAsync(owner);

        var ws = new Workspace { Id = 10, Name = "Workspace A" };
        await context.Workspaces.AddAsync(ws);

        var wu = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        await context.WorkspaceUsers.AddAsync(wu);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new InviteUserRequest("lasse@example.com");

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.InviteUserAsync(10, request));
    }

    [Fact]
    public async Task RemoveMemberAsync_ShouldReturnFalse_WhenMembershipDoesNotExist()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var service = new WorkspaceService(context, configuration);

        // Act
        var result = await service.RemoveMemberAsync(10, 1, requesterId: 1);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RemoveMemberAsync_ShouldRemoveUser_WhenRequesterIsLeavingThemselves()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var user = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        var ws = new Workspace { Id = 10, Name = "Workspace A" };
        var wu = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Member" };
        
        // Also have another user so workspace is not deleted
        var otherUser = new User { Id = 2, Name = "Alice" };
        var wu2 = new WorkspaceUser { WorkspaceId = 10, UserId = 2, Role = "Owner" };

        await context.Users.AddRangeAsync(user, otherUser);
        await context.Workspaces.AddAsync(ws);
        await context.WorkspaceUsers.AddRangeAsync(wu, wu2);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);

        // Act
        var result = await service.RemoveMemberAsync(10, 1, requesterId: 1);

        // Assert
        Assert.True(result);
        var membership = await context.WorkspaceUsers.AnyAsync(w => w.WorkspaceId == 10 && w.UserId == 1);
        Assert.False(membership);

        var workspaceExists = await context.Workspaces.AnyAsync(w => w.Id == 10);
        Assert.True(workspaceExists);
    }

    [Fact]
    public async Task RemoveMemberAsync_ShouldDeleteWorkspace_WhenLastMemberLeaves()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var user = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        var ws = new Workspace { Id = 10, Name = "Workspace A" };
        var wu = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };

        await context.Users.AddAsync(user);
        await context.Workspaces.AddAsync(ws);
        await context.WorkspaceUsers.AddAsync(wu);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);

        // Act
        var result = await service.RemoveMemberAsync(10, 1, requesterId: 1);

        // Assert
        Assert.True(result);
        var workspaceExists = await context.Workspaces.AnyAsync(w => w.Id == 10);
        Assert.False(workspaceExists);
    }

    [Fact]
    public async Task RemoveMemberAsync_ShouldThrow_WhenRequesterIsNonOwnerRemovingSomeoneElse()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var user1 = new User { Id = 1 };
        var user2 = new User { Id = 2 };
        var user3 = new User { Id = 3 }; // Requester (Member)
        
        var ws = new Workspace { Id = 10 };
        var wu1 = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        var wu2 = new WorkspaceUser { WorkspaceId = 10, UserId = 2, Role = "Member" };
        var wu3 = new WorkspaceUser { WorkspaceId = 10, UserId = 3, Role = "Member" };

        await context.Users.AddRangeAsync(user1, user2, user3);
        await context.Workspaces.AddAsync(ws);
        await context.WorkspaceUsers.AddRangeAsync(wu1, wu2, wu3);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RemoveMemberAsync(10, 2, requesterId: 3));
    }

    [Fact]
    public async Task RemoveMemberAsync_ShouldAllow_WhenRequesterIsOwnerRemovingSomeoneElse()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var user1 = new User { Id = 1 }; // Requester (Owner)
        var user2 = new User { Id = 2 }; // Target (Member)
        
        var ws = new Workspace { Id = 10 };
        var wu1 = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        var wu2 = new WorkspaceUser { WorkspaceId = 10, UserId = 2, Role = "Member" };

        await context.Users.AddRangeAsync(user1, user2);
        await context.Workspaces.AddAsync(ws);
        await context.WorkspaceUsers.AddRangeAsync(wu1, wu2);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);

        // Act
        var result = await service.RemoveMemberAsync(10, 2, requesterId: 1);

        // Assert
        Assert.True(result);
        var membershipExists = await context.WorkspaceUsers.AnyAsync(w => w.WorkspaceId == 10 && w.UserId == 2);
        Assert.False(membershipExists);
    }

    [Fact]
    public async Task GetInviteTokenAsync_ShouldGenerateToken_WhenNotExists()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var ws = new Workspace { Id = 10, Name = "Workspace A" };
        await context.Workspaces.AddAsync(ws);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);

        // Act
        var token = await service.GetInviteTokenAsync(10);

        // Assert
        Assert.NotNull(token);
        Assert.NotEmpty(token);
        
        var updatedWs = await context.Workspaces.FindAsync(10);
        Assert.Equal(token, updatedWs!.InviteToken);
    }

    [Fact]
    public async Task JoinWorkspaceAsync_ShouldAddUser_WhenTokenIsValid()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var ws = new Workspace { Id = 10, Name = "Workspace A", InviteToken = "valid-token" };
        var user = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        await context.Workspaces.AddAsync(ws);
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new JoinWorkspaceRequest("valid-token", 1);

        // Act
        var result = await service.JoinWorkspaceAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(10, result.Id);
        Assert.Equal("Workspace A", result.Name);
        Assert.Equal("Member", result.Role);
        Assert.Single(result.Members);
        Assert.Equal(1, result.Members[0].Id);
    }

    [Fact]
    public async Task JoinWorkspaceAsync_ShouldNotDuplicate_WhenUserIsAlreadyMember()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var ws = new Workspace { Id = 10, Name = "Workspace A", InviteToken = "valid-token" };
        var user = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        var wu = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Member" };
        await context.Workspaces.AddAsync(ws);
        await context.Users.AddAsync(user);
        await context.WorkspaceUsers.AddAsync(wu);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new JoinWorkspaceRequest("valid-token", 1);

        // Act
        var result = await service.JoinWorkspaceAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Members);
        
        var membershipCount = await context.WorkspaceUsers.CountAsync(w => w.WorkspaceId == 10 && w.UserId == 1);
        Assert.Equal(1, membershipCount);
    }

    [Fact]
    public async Task TransferOwnershipAsync_ShouldSwapRoles_WhenRequesterIsOwnerAndTargetIsMember()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var ws = new Workspace { Id = 10 };
        var wu1 = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        var wu2 = new WorkspaceUser { WorkspaceId = 10, UserId = 2, Role = "Member" };
        await context.Workspaces.AddAsync(ws);
        await context.WorkspaceUsers.AddRangeAsync(wu1, wu2);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new TransferOwnershipRequest(2, 1);

        // Act
        var result = await service.TransferOwnershipAsync(10, request);

        // Assert
        Assert.True(result);
        
        var updatedWu1 = await context.WorkspaceUsers.FirstOrDefaultAsync(w => w.WorkspaceId == 10 && w.UserId == 1);
        var updatedWu2 = await context.WorkspaceUsers.FirstOrDefaultAsync(w => w.WorkspaceId == 10 && w.UserId == 2);
        
        Assert.Equal("Member", updatedWu1!.Role);
        Assert.Equal("Owner", updatedWu2!.Role);
    }

    [Fact]
    public async Task TransferOwnershipAsync_ShouldThrow_WhenRequesterIsNotOwner()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var ws = new Workspace { Id = 10 };
        var wu1 = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        var wu2 = new WorkspaceUser { WorkspaceId = 10, UserId = 2, Role = "Member" };
        await context.Workspaces.AddAsync(ws);
        await context.WorkspaceUsers.AddRangeAsync(wu1, wu2);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new TransferOwnershipRequest(1, 2);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.TransferOwnershipAsync(10, request));
    }

    [Fact]
    public async Task RenameWorkspaceAsync_ShouldRenameWorkspace_WhenRequesterIsOwner()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var ws = new Workspace { Id = 10, Name = "Old Name" };
        var user = new User { Id = 1, Name = "Lasse", Email = "lasse@example.com" };
        var wu = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        await context.Workspaces.AddAsync(ws);
        await context.Users.AddAsync(user);
        await context.WorkspaceUsers.AddAsync(wu);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new RenameWorkspaceRequest("New Name", 1);

        // Act
        var result = await service.RenameWorkspaceAsync(10, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Name", result.Name);
        var updatedWs = await context.Workspaces.FindAsync(10);
        Assert.Equal("New Name", updatedWs!.Name);
    }

    [Fact]
    public async Task RenameWorkspaceAsync_ShouldThrow_WhenRequesterIsNotOwner()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var ws = new Workspace { Id = 10, Name = "Old Name" };
        var wu = new WorkspaceUser { WorkspaceId = 10, UserId = 2, Role = "Member" };
        await context.Workspaces.AddAsync(ws);
        await context.WorkspaceUsers.AddAsync(wu);
        await context.SaveChangesAsync();

        var service = new WorkspaceService(context, configuration);
        var request = new RenameWorkspaceRequest("New Name", 2);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RenameWorkspaceAsync(10, request));
    }

    [Fact]
    public async Task RenameWorkspaceAsync_ShouldReturnNull_WhenWorkspaceDoesNotExist()
    {
        // Arrange
        var (context, configuration) = SetupDependencies();
        var service = new WorkspaceService(context, configuration);
        var request = new RenameWorkspaceRequest("New Name", 1);

        // Act
        var result = await service.RenameWorkspaceAsync(999, request);

        // Assert
        Assert.Null(result);
    }
}
