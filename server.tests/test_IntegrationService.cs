using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Services;
using Xunit;

namespace LifePlanner.Api.Tests;

public class test_IntegrationService
{
    private (LifePlannerDbContext context, Mock<IGoogleTasksService> googleMock, Mock<IMicrosoftTodoService> msMock) SetupDependencies()
    {
        var options = new DbContextOptionsBuilder<LifePlannerDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new LifePlannerDbContext(options);
        
        var googleMock = new Mock<IGoogleTasksService>();
        var msMock = new Mock<IMicrosoftTodoService>();
        
        return (context, googleMock, msMock);
    }

    [Fact]
    public async Task GetStatusAsync_ShouldReturnCorrectStatus_WhenUserExists()
    {
        // Arrange
        var (context, googleMock, msMock) = SetupDependencies();
        var loggerMock = new Mock<ILogger<IntegrationService>>();
        
        var user = new User 
        { 
            Id = 1, 
            Name = "John", 
            Email = "john@example.com",
            MicrosoftTodoConnected = true,
            GoogleTasksConnected = false
        };
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        var service = new IntegrationService(context, googleMock.Object, msMock.Object, loggerMock.Object);

        // Act
        var result = await service.GetStatusAsync(1);

        // Assert
        Assert.True(result.MicrosoftTodoConnected);
        Assert.False(result.GoogleTasksConnected);
    }

    [Fact]
    public async Task ConnectAsync_ShouldSetGoogleTasksConnected_WhenProviderIsGoogleTasks()
    {
        // Arrange
        var (context, googleMock, msMock) = SetupDependencies();
        var loggerMock = new Mock<ILogger<IntegrationService>>();
        
        var user = new User { Id = 1, Name = "John", Email = "john@example.com", GoogleTasksConnected = false };
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        var service = new IntegrationService(context, googleMock.Object, msMock.Object, loggerMock.Object);

        // Act
        var result = await service.ConnectAsync(1, "GoogleTasks");

        // Assert
        Assert.True(result.GoogleTasksConnected);
        var updatedUser = await context.Users.FindAsync(1);
        Assert.True(updatedUser!.GoogleTasksConnected);
    }

    [Fact]
    public async Task DisconnectAsync_ShouldCleanUpMicrosoftTodo_WhenProviderIsMicrosoftTodo()
    {
        // Arrange
        var (context, googleMock, msMock) = SetupDependencies();
        var loggerMock = new Mock<ILogger<IntegrationService>>();
        
        var user = new User 
        { 
            Id = 1, 
            Name = "John", 
            Email = "john@example.com", 
            MicrosoftTodoConnected = true,
            MicrosoftAccessToken = "some-token"
        };
        await context.Users.AddAsync(user);
        
        // Setup default workspace and membership
        var workspace = new Workspace { Id = 10, Name = "Workspace A" };
        var workspaceUser = new WorkspaceUser { WorkspaceId = 10, UserId = 1, Role = "Owner" };
        await context.Workspaces.AddAsync(workspace);
        await context.WorkspaceUsers.AddAsync(workspaceUser);

        // Setup an imported Microsoft To-Do card
        var card = new Card 
        { 
            Id = 100, 
            Title = "MS Todo Cards", 
            WorkspaceId = 10, 
            UserId = 1, 
            IsChecklist = true,
            IntegrationSource = "MicrosoftTodo" 
        };
        await context.Cards.AddAsync(card);
        await context.SaveChangesAsync();

        var service = new IntegrationService(context, googleMock.Object, msMock.Object, loggerMock.Object);

        // Act
        var result = await service.DisconnectAsync(1, "MicrosoftTodo");

        // Assert
        Assert.False(result.MicrosoftTodoConnected);
        var updatedUser = await context.Users.FindAsync(1);
        Assert.False(updatedUser!.MicrosoftTodoConnected);
        Assert.Null(updatedUser.MicrosoftAccessToken);

        // Card should be deleted
        var deletedCard = await context.Cards.FindAsync(100);
        Assert.Null(deletedCard);
    }
}
