using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;

namespace LifePlanner.Api.Endpoints;

public static class CardEndpoints
{
    public static void MapCardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cards").WithTags("Cards");

        // Get all cards for a specific user
        app.MapGet("/api/users/{userId}/cards", async (int userId, ICardRepository repo) =>
        {
            var cards = await repo.GetCardsByUserIdAsync(userId);
            var result = cards.Select(c => new CardDto
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
            });
            return Results.Ok(result);
        }).WithTags("Cards");

        group.MapPost("/", async (Card card, ICardRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(card.Title) || card.UserId <= 0 || card.CategoryId <= 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Card", new[] { "Title, UserId, and CategoryId are required." } }
                });
            }

            await repo.AddAsync(card);

            // Reload and project to DTO
            var createdEntity = await repo.GetCardWithCategoryByIdAsync(card.Id);
            if (createdEntity == null) return Results.Problem("Error loading created card.");

            var created = new CardDto
            {
                Id = createdEntity.Id,
                Title = createdEntity.Title,
                Description = createdEntity.Description,
                ScheduledDate = createdEntity.ScheduledDate,
                CategoryId = createdEntity.CategoryId,
                UserId = createdEntity.UserId,
                Category = createdEntity.Category != null ? new CategoryDto
                {
                    Id = createdEntity.Category.Id,
                    Name = createdEntity.Category.Name,
                    Color = createdEntity.Category.Color
                } : null
            };

            return Results.Created($"/api/cards/{card.Id}", created);
        });

        group.MapPut("/{id}", async (int id, Card updatedCard, ICardRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(updatedCard.Title) || updatedCard.CategoryId <= 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Card", new[] { "Title and CategoryId are required." } }
                });
            }

            var card = await repo.GetByIdAsync(id);
            if (card is null) return Results.NotFound();

            card.Title = updatedCard.Title;
            card.Description = updatedCard.Description;
            card.CategoryId = updatedCard.CategoryId;
            card.ScheduledDate = updatedCard.ScheduledDate;
            
            await repo.UpdateAsync(card);

            // Load and project to DTO
            var resultEntity = await repo.GetCardWithCategoryByIdAsync(id);
            if (resultEntity == null) return Results.NotFound();

            var result = new CardDto
            {
                Id = resultEntity.Id,
                Title = resultEntity.Title,
                Description = resultEntity.Description,
                ScheduledDate = resultEntity.ScheduledDate,
                CategoryId = resultEntity.CategoryId,
                UserId = resultEntity.UserId,
                Category = resultEntity.Category != null ? new CategoryDto
                {
                    Id = resultEntity.Category.Id,
                    Name = resultEntity.Category.Name,
                    Color = resultEntity.Category.Color
                } : null
            };

            return Results.Ok(result);
        });

        group.MapDelete("/{id}", async (int id, ICardRepository repo) =>
        {
            var card = await repo.GetByIdAsync(id);
            if (card is null) return Results.NotFound();

            await repo.DeleteAsync(card);
            return Results.NoContent();
        });
    }
}
