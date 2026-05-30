using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;
using Xunit;

namespace LifePlanner.Api.Tests;

public class test_UserRepository
{
    private LifePlannerDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<LifePlannerDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new LifePlannerDbContext(options);
    }

    [Fact]
    public async Task AddAsync_ShouldAddUserToDatabase()
    {
        // Arrange
        using var context = CreateDbContext();
        var repo = new UserRepository(context);
        var user = new User { Name = "John Doe", Email = "john@example.com" };

        // Act
        await repo.AddAsync(user);

        // Assert
        var addedUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "john@example.com");
        Assert.NotNull(addedUser);
        Assert.Equal("John Doe", addedUser.Name);
    }

    [Fact]
    public async Task GetByGoogleAuthIdAsync_ShouldReturnCorrectUser()
    {
        // Arrange
        using var context = CreateDbContext();
        var repo = new UserRepository(context);
        
        var user1 = new User { Name = "User 1", Email = "u1@example.com", GoogleAuthId = "google-id-1" };
        var user2 = new User { Name = "User 2", Email = "u2@example.com", GoogleAuthId = "google-id-2" };
        
        await context.Users.AddRangeAsync(user1, user2);
        await context.SaveChangesAsync();

        // Act
        var result = await repo.GetByGoogleAuthIdAsync("google-id-2");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("User 2", result.Name);
    }

    [Fact]
    public async Task GetByGoogleAuthIdAsync_ShouldReturnNull_WhenUserDoesNotExist()
    {
        // Arrange
        using var context = CreateDbContext();
        var repo = new UserRepository(context);

        // Act
        var result = await repo.GetByGoogleAuthIdAsync("non-existent");

        // Assert
        Assert.Null(result);
    }
}
