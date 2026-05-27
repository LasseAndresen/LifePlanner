using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;
using LifePlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories").WithTags("Categories");

        // We also want an endpoint to get all categories for a workspace
        app.MapGet("/api/workspaces/{workspaceId:int}/categories", async (int workspaceId, ICategoryRepository repo) =>
        {
            var categories = await repo.GetCategoriesByWorkspaceIdAsync(workspaceId);
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
            if (string.IsNullOrWhiteSpace(category.Name) || category.WorkspaceId <= 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Category", new[] { "Name and a valid WorkspaceId are required." } }
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

        group.MapDelete("/{id}", async (int id, LifePlannerDbContext db) =>
        {
            var category = await db.Categories
                .Include(c => c.Cards)
                    .ThenInclude(c => c.ListItems)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category is null) return Results.NotFound();

            // 1. Orphan any ScheduledInstances directly referencing this Category
            var scheduledInstancesForCat = await db.ScheduledInstances
                .Where(si => si.CategoryId == id)
                .ToListAsync();
            foreach (var si in scheduledInstancesForCat)
            {
                si.CategoryId = null;
            }

            // 2. Orphan any ScheduledInstances referencing ListItems under any Card in this Category
            var cards = category.Cards.ToList();
            var listItemIds = cards.SelectMany(c => c.ListItems).Select(li => li.Id).ToList();
            if (listItemIds.Any())
            {
                var scheduledInstancesForItems = await db.ScheduledInstances
                    .Include(si => si.ListItem)
                    .Where(si => si.ListItemId.HasValue && listItemIds.Contains(si.ListItemId.Value))
                    .ToListAsync();
                foreach (var si in scheduledInstancesForItems)
                {
                    if (si.ListItem != null)
                    {
                        if (string.IsNullOrEmpty(si.Title))
                        {
                            si.Title = si.ListItem.Text;
                        }
                    }
                    si.ListItemId = null;
                    si.CategoryId = null;
                }
            }

            // 3. Remove the category. Cascade delete handles Cards and ListItems.
            db.Categories.Remove(category);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
