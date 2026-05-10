using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Endpoints;

public static class CardEndpoints
{
    public static void MapCardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cards").WithTags("Cards");

        // Get all cards for a specific user
        app.MapGet("/api/users/{userId}/cards", async (int userId, LifePlannerDbContext db) =>
        {
            var cards = await db.Cards
                .Include(c => c.Category)
                .Where(c => c.UserId == userId)
                .Select(c => new CardDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    ScheduledDate = c.ScheduledDate,
                    CategoryId = c.CategoryId,
                    UserId = c.UserId,
                    Category = c.Category != null ? new CategoryDto
                    {
                        Id = c.Category.Id,
                        Name = c.Category.Name,
                        Color = c.Category.Color
                    } : null
                })
                .ToListAsync();
            return Results.Ok(cards);
        }).WithTags("Cards");

        group.MapPost("/", async (Card card, LifePlannerDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(card.Title) || card.UserId <= 0 || card.CategoryId <= 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Card", new[] { "Title, UserId, and CategoryId are required." } }
                });
            }

            db.Cards.Add(card);
            await db.SaveChangesAsync();

            // Reload and project to DTO
            var created = await db.Cards
                .Include(c => c.Category)
                .Select(c => new CardDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    ScheduledDate = c.ScheduledDate,
                    CategoryId = c.CategoryId,
                    UserId = c.UserId,
                    Category = c.Category != null ? new CategoryDto
                    {
                        Id = c.Category.Id,
                        Name = c.Category.Name,
                        Color = c.Category.Color
                    } : null
                })
                .FirstAsync(c => c.Id == card.Id);

            return Results.Created($"/api/cards/{card.Id}", created);
        });

        group.MapPut("/{id}", async (int id, Card updatedCard, LifePlannerDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(updatedCard.Title) || updatedCard.CategoryId <= 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Card", new[] { "Title and CategoryId are required." } }
                });
            }

            var card = await db.Cards.FindAsync(id);
            if (card is null) return Results.NotFound();

            card.Title = updatedCard.Title;
            card.Description = updatedCard.Description;
            card.CategoryId = updatedCard.CategoryId;
            card.ScheduledDate = updatedCard.ScheduledDate;
            
            await db.SaveChangesAsync();

            // Load and project to DTO
            var result = await db.Cards
                .Include(c => c.Category)
                .Select(c => new CardDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    ScheduledDate = c.ScheduledDate,
                    CategoryId = c.CategoryId,
                    UserId = c.UserId,
                    Category = c.Category != null ? new CategoryDto
                    {
                        Id = c.Category.Id,
                        Name = c.Category.Name,
                        Color = c.Category.Color
                    } : null
                })
                .FirstAsync(c => c.Id == id);

            return Results.Ok(result);
        });

        group.MapDelete("/{id}", async (int id, LifePlannerDbContext db) =>
        {
            var card = await db.Cards.FindAsync(id);
            if (card is null) return Results.NotFound();

            db.Cards.Remove(card);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
