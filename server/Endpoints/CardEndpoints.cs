using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;
using Microsoft.EntityFrameworkCore;

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
            var result = cards.Select(ToDto);
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

            var createdEntity = await repo.GetCardWithCategoryByIdAsync(card.Id);
            if (createdEntity == null) return Results.Problem("Error loading created card.");

            return Results.Created($"/api/cards/{card.Id}", ToDto(createdEntity));
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
            card.IsChecklist = updatedCard.IsChecklist;

            await repo.UpdateAsync(card);

            var resultEntity = await repo.GetCardWithCategoryByIdAsync(id);
            if (resultEntity == null) return Results.NotFound();

            return Results.Ok(ToDto(resultEntity));
        });

        group.MapDelete("/{id}", async (int id, ICardRepository repo) =>
        {
            var card = await repo.GetByIdAsync(id);
            if (card is null) return Results.NotFound();

            await repo.DeleteAsync(card);
            return Results.NoContent();
        });

        // --- List Item endpoints ---

        group.MapPost("/{cardId}/items", async (int cardId, ListItem item, ICardRepository repo, LifePlannerDbContext db) =>
        {
            var card = await repo.GetByIdAsync(cardId);
            if (card is null) return Results.NotFound();

            item.CardId = cardId;
            db.ListItems.Add(item);
            await db.SaveChangesAsync();

            return Results.Created($"/api/cards/{cardId}/items/{item.Id}", ToItemDto(item));
        }).WithTags("Cards");

        group.MapPut("/{cardId}/items/{itemId}", async (int cardId, int itemId, ListItem updatedItem, LifePlannerDbContext db) =>
        {
            var item = await db.ListItems.FirstOrDefaultAsync(i => i.Id == itemId && i.CardId == cardId);
            if (item is null) return Results.NotFound();

            item.Text = updatedItem.Text;
            item.IsCompleted = updatedItem.IsCompleted;
            await db.SaveChangesAsync();

            return Results.Ok(ToItemDto(item));
        }).WithTags("Cards");

        group.MapDelete("/{cardId}/items/{itemId}", async (int cardId, int itemId, LifePlannerDbContext db) =>
        {
            var item = await db.ListItems.FirstOrDefaultAsync(i => i.Id == itemId && i.CardId == cardId);
            if (item is null) return Results.NotFound();

            db.ListItems.Remove(item);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).WithTags("Cards");
    }

    private static CardDto ToDto(Card c) => new()
    {
        Id = c.Id,
        Title = c.Title,
        Description = c.Description,
        ScheduledDate = c.ScheduledDate,
        IsChecklist = c.IsChecklist,
        ListItems = c.ListItems.Select(ToItemDto).ToList(),
        CategoryId = c.CategoryId,
        UserId = c.UserId,
        Category = c.Category != null ? new CategoryDto
        {
            Id = c.Category.Id,
            Name = c.Category.Name,
            Color = c.Category.Color
        } : null
    };

    private static ListItemDto ToItemDto(ListItem i) => new()
    {
        Id = i.Id,
        Text = i.Text,
        IsCompleted = i.IsCompleted,
        CardId = i.CardId
    };
}
