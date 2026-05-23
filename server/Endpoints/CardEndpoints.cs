using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using System.Linq;

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

        // Reorder cards endpoint
        group.MapPost("/reorder", async (List<ReorderCardsDto> reordered, ICardRepository repo) =>
        {
            await repo.ReorderCardsAsync(reordered ?? new List<ReorderCardsDto>());
            return Results.Ok();
        }).WithTags("Cards");

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
            var item = await db.ListItems.Include(i => i.ScheduledInstances).FirstOrDefaultAsync(i => i.Id == itemId && i.CardId == cardId);
            if (item is null) return Results.NotFound();

            item.Text = updatedItem.Text;
            item.IsCompleted = updatedItem.IsCompleted;
            if (updatedItem.CardId > 0 && updatedItem.CardId != cardId)
            {
                item.CardId = updatedItem.CardId;
            }
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

        // --- Scheduled Instance endpoints ---

        group.MapPost("/{cardId}/items/{itemId}/instances", async (int cardId, int itemId, ScheduledInstance instanceReq, LifePlannerDbContext db) =>
        {
            var item = await db.ListItems.Include(i => i.ScheduledInstances).FirstOrDefaultAsync(i => i.Id == itemId && i.CardId == cardId);
            if (item is null) return Results.NotFound();

            var newInstance = new ScheduledInstance
            {
                Date = instanceReq.Date,
                IsCompleted = instanceReq.IsCompleted,
                ListItemId = itemId
            };
            db.ScheduledInstances.Add(newInstance);
            await db.SaveChangesAsync();

            return Results.Created($"/api/cards/{cardId}/items/{itemId}/instances/{newInstance.Id}", ToInstanceDto(newInstance));
        }).WithTags("Cards");

        group.MapPut("/{cardId}/items/{itemId}/instances/{instanceId}", async (int cardId, int itemId, int instanceId, ScheduledInstance updatedInstance, LifePlannerDbContext db) =>
        {
            var inst = await db.ScheduledInstances.FirstOrDefaultAsync(s => s.Id == instanceId && s.ListItemId == itemId);
            if (inst is null) return Results.NotFound();

            inst.Date = updatedInstance.Date;
            inst.IsCompleted = updatedInstance.IsCompleted;
            await db.SaveChangesAsync();

            return Results.Ok(ToInstanceDto(inst));
        }).WithTags("Cards");

        group.MapDelete("/{cardId}/items/{itemId}/instances/{instanceId}", async (int cardId, int itemId, int instanceId, LifePlannerDbContext db) =>
        {
            var inst = await db.ScheduledInstances.FirstOrDefaultAsync(s => s.Id == instanceId && s.ListItemId == itemId);
            if (inst is null) return Results.NotFound();

            db.ScheduledInstances.Remove(inst);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).WithTags("Cards");
    }

    private static CardDto ToDto(Card c) => new()
    {
        Id = c.Id,
        Order = c.Order,
        Title = c.Title,
        Description = c.Description,
        ScheduledDate = c.ScheduledDate,
        IsChecklist = c.IsChecklist,
        ListItems = c.ListItems.Select(ToItemDto).ToList(),
        CategoryId = c.CategoryId,
        UserId = c.UserId,
        IntegrationSource = c.IntegrationSource,
        IntegrationExternalId = c.IntegrationExternalId,
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
        CardId = i.CardId,
        IntegrationExternalId = i.IntegrationExternalId,
        ScheduledInstances = i.ScheduledInstances?.Select(ToInstanceDto).ToList() ?? new()
    };

    private static ScheduledInstanceDto ToInstanceDto(ScheduledInstance inst) => new()
    {
        Id = inst.Id,
        Date = inst.Date,
        IsCompleted = inst.IsCompleted,
        ListItemId = inst.ListItemId
    };
}
