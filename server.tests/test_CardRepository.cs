using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;
using Xunit;

namespace LifePlanner.Api.Tests;

public class test_CardRepository
{
    private LifePlannerDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<LifePlannerDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new LifePlannerDbContext(options);
    }

    [Fact]
    public async Task GetCardsByWorkspaceIdAsync_ShouldReturnOrderedCardsInWorkspace_WithIncludes()
    {
        // Arrange
        using var context = CreateDbContext();
        var repo = new CardRepository(context);

        var cat = new Category { Id = 5, Name = "Ideas", Color = "#3b82f6" };
        await context.Categories.AddAsync(cat);

        // Card 1 in Workspace 10, Order 2
        var card1 = new Card { Id = 1, Title = "Card A", WorkspaceId = 10, Order = 2, CategoryId = 5 };
        // Card 2 in Workspace 10, Order 1
        var card2 = new Card { Id = 2, Title = "Card B", WorkspaceId = 10, Order = 1, CategoryId = 5 };
        // Card 3 in Workspace 20, Order 0
        var card3 = new Card { Id = 3, Title = "Card C", WorkspaceId = 20, Order = 0, CategoryId = 5 };

        var item = new ListItem { Id = 100, Text = "List Item", CardId = 2 };
        var si = new ScheduledInstance { Id = 200, Date = DateTime.Parse("2026-05-30"), ListItemId = 100 };

        await context.Cards.AddRangeAsync(card1, card2, card3);
        await context.ListItems.AddAsync(item);
        await context.ScheduledInstances.AddAsync(si);
        await context.SaveChangesAsync();

        // Act
        var result = (await repo.GetCardsByWorkspaceIdAsync(10)).ToList();

        // Assert
        Assert.Equal(2, result.Count);
        // Assert order (Order 1 should be first, then Order 2)
        Assert.Equal(2, result[0].Id);
        Assert.Equal(1, result[1].Id);
        
        // Assert includes (Category, ListItems, ScheduledInstances)
        Assert.NotNull(result[0].Category);
        Assert.Equal("Ideas", result[0].Category!.Name);
        Assert.Single(result[0].ListItems);
        Assert.Equal("List Item", result[0].ListItems.First().Text);
        Assert.Single(result[0].ListItems.First().ScheduledInstances);
    }

    [Fact]
    public async Task GetCardWithCategoryByIdAsync_ShouldReturnCardWithIncludes()
    {
        // Arrange
        using var context = CreateDbContext();
        var repo = new CardRepository(context);

        var cat = new Category { Id = 3, Name = "Chores", Color = "#00ff00" };
        var card = new Card { Id = 1, Title = "Clean Room", CategoryId = 3 };
        await context.Categories.AddAsync(cat);
        await context.Cards.AddAsync(card);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetCardWithCategoryByIdAsync(1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Clean Room", result.Title);
        Assert.NotNull(result.Category);
        Assert.Equal("Chores", result.Category!.Name);
    }

    [Fact]
    public async Task AddAsync_ShouldAssignNextOrderValue_InGivenWorkspace()
    {
        // Arrange
        using var context = CreateDbContext();
        var repo = new CardRepository(context);

        // Existing cards in Workspace 10 (Max order is 5)
        var cardA1 = new Card { Id = 1, Title = "A1", WorkspaceId = 10, Order = 2 };
        var cardA2 = new Card { Id = 2, Title = "A2", WorkspaceId = 10, Order = 5 };
        // Existing card in Workspace 20 (Max order is 10)
        var cardB1 = new Card { Id = 3, Title = "B1", WorkspaceId = 20, Order = 10 };

        await context.Cards.AddRangeAsync(cardA1, cardA2, cardB1);
        await context.SaveChangesAsync();

        // Act: Add new card in Workspace 10
        var newCard1 = new Card { Id = 4, Title = "New A3", WorkspaceId = 10 };
        await repo.AddAsync(newCard1);

        // Act: Add new card in Workspace 30 (empty workspace)
        var newCard2 = new Card { Id = 5, Title = "New C1", WorkspaceId = 30 };
        await repo.AddAsync(newCard2);

        // Assert: Workspace 10 card order should be 5 + 1 = 6
        var savedCard1 = await context.Cards.FindAsync(4);
        Assert.Equal(6, savedCard1!.Order);

        // Assert: Workspace 30 card order should be 0 (fallback -1 + 1)
        var savedCard2 = await context.Cards.FindAsync(5);
        Assert.Equal(0, savedCard2!.Order);
    }

    [Fact]
    public async Task ReorderCardsAsync_ShouldUpdateCardOrders()
    {
        // Arrange
        using var context = CreateDbContext();
        var repo = new CardRepository(context);

        var card1 = new Card { Id = 1, Title = "Card 1", Order = 0 };
        var card2 = new Card { Id = 2, Title = "Card 2", Order = 1 };
        await context.Cards.AddRangeAsync(card1, card2);
        await context.SaveChangesAsync();

        var reorderRequest = new List<ReorderCardsDto>
        {
            new() { Id = 1, Order = 5 },
            new() { Id = 2, Order = 2 }
        };

        // Act
        await repo.ReorderCardsAsync(reorderRequest);

        // Assert
        var saved1 = await context.Cards.FindAsync(1);
        var saved2 = await context.Cards.FindAsync(2);
        
        Assert.Equal(5, saved1!.Order);
        Assert.Equal(2, saved2!.Order);
    }
}
