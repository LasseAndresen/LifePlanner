using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories").WithTags("Categories");

        // We also want an endpoint to get all categories for a user
        app.MapGet("/api/users/{userId}/categories", async (int userId, LifePlannerDbContext db) =>
        {
            var categories = await db.Categories.Where(c => c.UserId == userId).ToListAsync();
            return Results.Ok(categories);
        }).WithTags("Categories");

        group.MapPost("/", async (Category category, LifePlannerDbContext db) =>
        {
            db.Categories.Add(category);
            await db.SaveChangesAsync();
            return Results.Created($"/api/categories/{category.Id}", category);
        });

        group.MapPut("/{id}", async (int id, Category updatedCategory, LifePlannerDbContext db) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category is null) return Results.NotFound();

            category.Name = updatedCategory.Name;
            category.Color = updatedCategory.Color;
            
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/{id}", async (int id, LifePlannerDbContext db) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category is null) return Results.NotFound();

            db.Categories.Remove(category);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
