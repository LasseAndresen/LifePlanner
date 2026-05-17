using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;

namespace LifePlanner.Api.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories").WithTags("Categories");

        // We also want an endpoint to get all categories for a user
        app.MapGet("/api/users/{userId}/categories", async (int userId, ICategoryRepository repo) =>
        {
            var categories = await repo.GetCategoriesByUserIdAsync(userId);
            var result = categories.Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Color = c.Color
            });
            return Results.Ok(result);
        }).WithTags("Categories");

        group.MapPost("/", async (Category category, ICategoryRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(category.Name) || category.UserId <= 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Category", new[] { "Name and a valid UserId are required." } }
                });
            }

            await repo.AddAsync(category);
            
            var result = new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Color = category.Color
            };

            return Results.Created($"/api/categories/{category.Id}", result);
        });

        group.MapPut("/{id}", async (int id, Category updatedCategory, ICategoryRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(updatedCategory.Name))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Category", new[] { "Name is required." } }
                });
            }

            var category = await repo.GetByIdAsync(id);
            if (category is null) return Results.NotFound();

            category.Name = updatedCategory.Name;
            category.Color = updatedCategory.Color;
            
            await repo.UpdateAsync(category);
            return Results.NoContent();
        });

        group.MapDelete("/{id}", async (int id, ICategoryRepository repo) =>
        {
            var category = await repo.GetByIdAsync(id);
            if (category is null) return Results.NotFound();

            await repo.DeleteAsync(category);
            return Results.NoContent();
        });
    }
}
