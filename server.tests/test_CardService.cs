using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;
using LifePlanner.Api.Services;
using Xunit;

namespace LifePlanner.Api.Tests;

public class test_CardService
{
    private (
        LifePlannerDbContext context, 
        Mock<ICardRepository> cardRepoMock, 
        Mock<IMicrosoftTodoService> todoMock, 
        Mock<IGoogleTasksService> googleMock, 
        Mock<IGoogleCalendarService> calendarMock,
        Mock<ILogger<CardService>> loggerMock
    ) SetupDependencies()
    {
        var options = new DbContextOptionsBuilder<LifePlannerDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new LifePlannerDbContext(options);

        var cardRepoMock = new Mock<ICardRepository>();
        var todoMock = new Mock<IMicrosoftTodoService>();
        var googleMock = new Mock<IGoogleTasksService>();
        var calendarMock = new Mock<IGoogleCalendarService>();
        var loggerMock = new Mock<ILogger<CardService>>();

        return (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock);
    }

    [Fact]
    public async Task DeleteCardAsync_ShouldOrphanScheduledInstances_WhenCardIsDeleted()
    {
        // Arrange
        var (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock) = SetupDependencies();
        
        var card = new Card { Id = 1, Title = "Card 1", CategoryId = 5, WorkspaceId = 10, UserId = 100 };
        var item = new ListItem { Id = 10, Text = "Task item", CardId = 1, IsCompleted = false, Card = card };
        var si = new ScheduledInstance { Id = 20, Date = DateTime.Parse("2026-05-30"), ListItemId = 10, ListItem = item, UserId = 100, Title = null, CategoryId = null };

        await context.Cards.AddAsync(card);
        await context.ListItems.AddAsync(item);
        await context.ScheduledInstances.AddAsync(si);
        await context.SaveChangesAsync();

        var service = new CardService(context, cardRepoMock.Object, todoMock.Object, googleMock.Object, calendarMock.Object, loggerMock.Object);

        // Act
        var result = await service.DeleteCardAsync(1);

        // Assert
        Assert.True(result);
        
        // Card and item should be removed
        var deletedCard = await context.Cards.FindAsync(1);
        var deletedItem = await context.ListItems.FindAsync(10);
        Assert.Null(deletedCard);
        Assert.Null(deletedItem);

        // ScheduledInstance should be orphaned but retained with item title and card category
        var reloadedSi = await context.ScheduledInstances.FindAsync(20);
        Assert.NotNull(reloadedSi);
        Assert.Null(reloadedSi.ListItemId);
        Assert.Equal("Task item", reloadedSi.Title);
        Assert.Equal(5, reloadedSi.CategoryId);
    }

    [Fact]
    public async Task AddListItemAsync_ShouldCallMicrosoftTodoService_WhenIntegrationIsConnected()
    {
        // Arrange
        var (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock) = SetupDependencies();

        var user = new User { Id = 100, MicrosoftTodoConnected = true };
        var card = new Card { Id = 1, Title = "MS Card", IntegrationSource = "MicrosoftTodo", IntegrationExternalId = "ext-list-id", UserId = 100, User = user };
        await context.Users.AddAsync(user);
        await context.Cards.AddAsync(card);
        await context.SaveChangesAsync();

        todoMock.Setup(t => t.GetOrRefreshTokenAsync(user)).ReturnsAsync("mock-access-token");
        todoMock.Setup(t => t.CreateTaskAsync("mock-access-token", "ext-list-id", "New Task")).ReturnsAsync("ext-task-id");

        var service = new CardService(context, cardRepoMock.Object, todoMock.Object, googleMock.Object, calendarMock.Object, loggerMock.Object);
        var newItem = new ListItem { Text = "New Task" };

        // Act
        var result = await service.AddListItemAsync(1, newItem);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("ext-task-id", result.IntegrationExternalId);
        todoMock.Verify(t => t.CreateTaskAsync("mock-access-token", "ext-list-id", "New Task"), Times.Once);
    }

    [Fact]
    public async Task AddListItemAsync_ShouldCallGoogleTasksService_WhenIntegrationIsConnected()
    {
        // Arrange
        var (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock) = SetupDependencies();

        var user = new User { Id = 100, GoogleTasksConnected = true };
        var card = new Card { Id = 1, Title = "Google Card", IntegrationSource = "GoogleTasks", IntegrationExternalId = "ext-list-id", UserId = 100, User = user };
        await context.Users.AddAsync(user);
        await context.Cards.AddAsync(card);
        await context.SaveChangesAsync();

        var googleTask = new Google.Apis.Tasks.v1.Data.Task { Id = "ext-task-id", Position = "0000000001" };
        googleMock.Setup(g => g.CreateTaskAsync(user, "ext-list-id", "New Google Task")).ReturnsAsync(googleTask);

        var service = new CardService(context, cardRepoMock.Object, todoMock.Object, googleMock.Object, calendarMock.Object, loggerMock.Object);
        var newItem = new ListItem { Text = "New Google Task" };

        // Act
        var result = await service.AddListItemAsync(1, newItem);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("ext-task-id", result.IntegrationExternalId);
        Assert.Equal("0000000001", result.Position);
        googleMock.Verify(g => g.CreateTaskAsync(user, "ext-list-id", "New Google Task"), Times.Once);
    }

    [Fact]
    public async Task UpdateListItemAsync_ShouldSyncCompletionAndRenameToScheduledInstancesAndTodo()
    {
        // Arrange
        var (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock) = SetupDependencies();

        var user = new User { Id = 100, MicrosoftTodoConnected = true };
        var card = new Card { Id = 1, Title = "MS Card", IntegrationSource = "MicrosoftTodo", IntegrationExternalId = "ext-list-id", UserId = 100, User = user };
        var item = new ListItem { Id = 10, CardId = 1, Text = "Old Name", IsCompleted = false, IntegrationExternalId = "ext-task-id", Card = card };
        var si = new ScheduledInstance { Id = 20, Date = DateTime.Parse("2026-05-30"), ListItemId = 10, ListItem = item, Title = "Old Name", IsCompleted = false };

        await context.Users.AddAsync(user);
        await context.Cards.AddAsync(card);
        await context.ListItems.AddAsync(item);
        await context.ScheduledInstances.AddAsync(si);
        await context.SaveChangesAsync();

        todoMock.Setup(t => t.GetOrRefreshTokenAsync(user)).ReturnsAsync("mock-access-token");
        todoMock.Setup(t => t.UpdateTaskAsync("mock-access-token", "ext-list-id", "ext-task-id", "New Name", true)).Returns(Task.CompletedTask);

        var service = new CardService(context, cardRepoMock.Object, todoMock.Object, googleMock.Object, calendarMock.Object, loggerMock.Object);
        var updatedItem = new ListItem { Text = "New Name", IsCompleted = true };

        // Act
        var result = await service.UpdateListItemAsync(1, 10, updatedItem);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsCompleted);
        Assert.Equal("New Name", result.Text);

        // Verify local DB scheduled instance was updated
        var reloadedSi = await context.ScheduledInstances.FindAsync(20);
        Assert.True(reloadedSi!.IsCompleted);
        Assert.Equal("New Name", reloadedSi.Title);

        // Verify external sync call
        todoMock.Verify(t => t.UpdateTaskAsync("mock-access-token", "ext-list-id", "ext-task-id", "New Name", true), Times.Once);
    }

    [Fact]
    public async Task DeleteListItemAsync_ShouldOrphanScheduledInstancesAndCallDeleteTasks()
    {
        // Arrange
        var (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock) = SetupDependencies();

        var user = new User { Id = 100, GoogleTasksConnected = true };
        var card = new Card { Id = 1, Title = "Google Card", IntegrationSource = "GoogleTasks", IntegrationExternalId = "ext-list-id", UserId = 100, User = user, CategoryId = 3 };
        var item = new ListItem { Id = 10, CardId = 1, Text = "Task item", IntegrationExternalId = "ext-task-id", Card = card };
        var si = new ScheduledInstance { Id = 20, Date = DateTime.Parse("2026-05-30"), ListItemId = 10, ListItem = item, Title = null, CategoryId = null };

        await context.Users.AddAsync(user);
        await context.Cards.AddAsync(card);
        await context.ListItems.AddAsync(item);
        await context.ScheduledInstances.AddAsync(si);
        await context.SaveChangesAsync();

        googleMock.Setup(g => g.DeleteTaskAsync(user, "ext-list-id", "ext-task-id")).Returns(Task.CompletedTask);

        var service = new CardService(context, cardRepoMock.Object, todoMock.Object, googleMock.Object, calendarMock.Object, loggerMock.Object);

        // Act
        var result = await service.DeleteListItemAsync(1, 10);

        // Assert
        Assert.True(result);
        googleMock.Verify(g => g.DeleteTaskAsync(user, "ext-list-id", "ext-task-id"), Times.Once);

        // Verify ScheduledInstance orphaned
        var reloadedSi = await context.ScheduledInstances.FindAsync(20);
        Assert.NotNull(reloadedSi);
        Assert.Null(reloadedSi.ListItemId);
        Assert.Equal("Task item", reloadedSi.Title);
        Assert.Equal(3, reloadedSi.CategoryId);
    }

    [Fact]
    public async Task UpdateScheduledInstanceAsync_ShouldSyncCompletionToAllLinkedInstancesAndTodo()
    {
        // Arrange
        var (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock) = SetupDependencies();

        var user = new User { Id = 100, MicrosoftTodoConnected = true };
        var card = new Card { Id = 1, Title = "MS Card", IntegrationSource = "MicrosoftTodo", IntegrationExternalId = "ext-list-id", UserId = 100, User = user };
        var item = new ListItem { Id = 10, CardId = 1, Text = "Task", IsCompleted = false, IntegrationExternalId = "ext-task-id", Card = card };
        var si1 = new ScheduledInstance { Id = 20, Date = DateTime.Parse("2026-05-30"), ListItemId = 10, ListItem = item, Title = "Task", IsCompleted = false, UserId = 100 };
        var si2 = new ScheduledInstance { Id = 21, Date = DateTime.Parse("2026-05-30"), ListItemId = 10, ListItem = item, Title = "Task", IsCompleted = false, UserId = 100 };

        await context.Users.AddAsync(user);
        await context.Cards.AddAsync(card);
        await context.ListItems.AddAsync(item);
        await context.ScheduledInstances.AddRangeAsync(si1, si2);
        await context.SaveChangesAsync();

        todoMock.Setup(t => t.GetOrRefreshTokenAsync(user)).ReturnsAsync("mock-access-token");
        todoMock.Setup(t => t.UpdateTaskAsync("mock-access-token", "ext-list-id", "ext-task-id", null, true)).Returns(Task.CompletedTask);

        var service = new CardService(context, cardRepoMock.Object, todoMock.Object, googleMock.Object, calendarMock.Object, loggerMock.Object);
        var updatedInstance = new ScheduledInstance { IsCompleted = true, Date = DateTime.Parse("2026-05-30"), ListItemId = 10 };

        // Act
        var result = await service.UpdateScheduledInstanceAsync(20, updatedInstance);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsCompleted);

        // Verifying list item was updated to completed
        var reloadedItem = await context.ListItems.FindAsync(10);
        Assert.True(reloadedItem!.IsCompleted);

        // Verifying other scheduled instance of the same list item was updated
        var reloadedSi2 = await context.ScheduledInstances.FindAsync(21);
        Assert.True(reloadedSi2!.IsCompleted);

        // Verify Microsoft Todo integration was called
        todoMock.Verify(t => t.UpdateTaskAsync("mock-access-token", "ext-list-id", "ext-task-id", null, true), Times.Once);
    }

    [Fact]
    public async Task UpdateScheduledInstanceAsync_ShouldCreateGoogleEvent_WhenNowConfirmed()
    {
        // Arrange
        var (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock) = SetupDependencies();

        var user = new User { Id = 100, GoogleAccessToken = "valid-token" };
        var si = new ScheduledInstance { Id = 20, Date = DateTime.Parse("2026-05-30"), Title = "Event", IsCompleted = false, UserId = 100, IsConfirmed = false };

        await context.Users.AddAsync(user);
        await context.ScheduledInstances.AddAsync(si);
        await context.SaveChangesAsync();

        calendarMock.Setup(c => c.CreateEventAsync(user, It.IsAny<ScheduledInstance>())).ReturnsAsync("google-event-id");

        var service = new CardService(context, cardRepoMock.Object, todoMock.Object, googleMock.Object, calendarMock.Object, loggerMock.Object);
        var updated = new ScheduledInstance { Title = "Event", IsConfirmed = true, Date = DateTime.Parse("2026-05-30") };

        // Act
        var result = await service.UpdateScheduledInstanceAsync(20, updated);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsConfirmed);
        Assert.Equal("google-event-id", result.GoogleEventId);

        calendarMock.Verify(c => c.CreateEventAsync(user, It.IsAny<ScheduledInstance>()), Times.Once);
    }

    [Fact]
    public async Task UpdateScheduledInstanceAsync_ShouldDeleteGoogleEvent_WhenNoLongerConfirmed()
    {
        // Arrange
        var (context, cardRepoMock, todoMock, googleMock, calendarMock, loggerMock) = SetupDependencies();

        var user = new User { Id = 100, GoogleAccessToken = "valid-token" };
        var si = new ScheduledInstance { Id = 20, Date = DateTime.Parse("2026-05-30"), Title = "Event", IsCompleted = false, UserId = 100, IsConfirmed = true, GoogleEventId = "google-event-id" };

        await context.Users.AddAsync(user);
        await context.ScheduledInstances.AddAsync(si);
        await context.SaveChangesAsync();

        calendarMock.Setup(c => c.DeleteEventAsync(user, "google-event-id")).Returns(Task.CompletedTask);

        var service = new CardService(context, cardRepoMock.Object, todoMock.Object, googleMock.Object, calendarMock.Object, loggerMock.Object);
        var updated = new ScheduledInstance { Title = "Event", IsConfirmed = false, Date = DateTime.Parse("2026-05-30") };

        // Act
        var result = await service.UpdateScheduledInstanceAsync(20, updated);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsConfirmed);
        Assert.Null(result.GoogleEventId);

        calendarMock.Verify(c => c.DeleteEventAsync(user, "google-event-id"), Times.Once);
    }
}
