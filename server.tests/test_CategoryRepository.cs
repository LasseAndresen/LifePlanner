using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;
using Xunit;

namespace LifePlanner.Api.Tests;

public class test_CategoryRepository
{
    private LifePlannerDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<LifePlannerDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new LifePlannerDbContext(options);
    }

    [Fact]
    public async Task GetCategoriesByWorkspaceIdAsync_ShouldReturnWorkspaceSpecificCategories()
    {
        // Arrange
        using var context = CreateDbContext();
        var repo = new CategoryRepository(context);

        var cat1 = new Category { Id = 1, Name = "Work", Color = "#ff0000", WorkspaceId = 10, UserId = 1 };
        var cat2 = new Category { Id = 2, Name = "Personal", Color = "#00ff00", WorkspaceId = 10, UserId = 1 };
        var cat3 = new Category { Id = 3, Name = "Other", Color = "#0000ff", WorkspaceId = 20, UserId = 1 };

        await context.Categories.AddRangeAsync(cat1, cat2, cat3);
        await context.SaveChangesAsync();

        // Act
        var result = (await repo.GetCategoriesByWorkspaceIdAsync(10)).ToList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Contains(result, c => c.Name == "Work");
        Assert.Contains(result, c => c.Name == "Personal");
        Assert.DoesNotContain(result, c => c.Name == "Other");
    }
}
