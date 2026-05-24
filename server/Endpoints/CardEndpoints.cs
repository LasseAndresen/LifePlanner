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
            card.WhiteboardX = updatedCard.WhiteboardX;
            card.WhiteboardY = updatedCard.WhiteboardY;

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

            // Sync rename to all linked scheduled instances in the DB
            if (item.ScheduledInstances != null)
            {
                foreach (var inst in item.ScheduledInstances)
                {
                    inst.Title = updatedItem.Text;
                }
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

        // --- Flat Scheduled Instance endpoints ---

        // GET /api/users/{userId}/scheduled-instances
        app.MapGet("/api/users/{userId}/scheduled-instances", async (int userId, LifePlannerDbContext db) =>
        {
            var instances = await db.ScheduledInstances
                .Include(si => si.Category)
                .Include(si => si.ListItem)
                    .ThenInclude(li => li!.Card)
                        .ThenInclude(c => c!.Category)
                .Where(si => si.UserId == userId)
                .ToListAsync();
            return Results.Ok(instances.Select(ToInstanceDto));
        }).WithTags("ScheduledInstances");

        var instanceGroup = app.MapGroup("/api/scheduled-instances").WithTags("ScheduledInstances");

        // POST /api/scheduled-instances
        instanceGroup.MapPost("/", async (ScheduledInstance instance, LifePlannerDbContext db) =>
        {
            if (instance.UserId <= 0)
            {
                return Results.BadRequest("UserId is required.");
            }

            if (instance.ListItemId.HasValue)
            {
                var item = await db.ListItems.Include(li => li.Card).FirstOrDefaultAsync(li => li.Id == instance.ListItemId.Value);
                if (item == null) return Results.NotFound("ListItem not found.");
                
                // If it is linked to a task, we set the task context title
                instance.Title = item.Text;
            }

            db.ScheduledInstances.Add(instance);
            await db.SaveChangesAsync();

            // Load it back with includes
            var reloaded = await db.ScheduledInstances
                .Include(si => si.Category)
                .Include(si => si.ListItem)
                    .ThenInclude(li => li!.Card)
                        .ThenInclude(c => c!.Category)
                .FirstAsync(si => si.Id == instance.Id);

            return Results.Created($"/api/scheduled-instances/{instance.Id}", ToInstanceDto(reloaded));
        });

        // PUT /api/scheduled-instances/{id}
        instanceGroup.MapPut("/{id:int}", async (int id, ScheduledInstance updatedInstance, LifePlannerDbContext db) =>
        {
            var inst = await db.ScheduledInstances.FirstOrDefaultAsync(s => s.Id == id);
            if (inst is null) return Results.NotFound();

            inst.Date = updatedInstance.Date;
            inst.IsCompleted = updatedInstance.IsCompleted;
            inst.Title = updatedInstance.Title;
            inst.Description = updatedInstance.Description;
            inst.Type = updatedInstance.Type;
            inst.StartTime = updatedInstance.StartTime;
            inst.EndTime = updatedInstance.EndTime;
            inst.CategoryId = updatedInstance.CategoryId;
            inst.ListItemId = updatedInstance.ListItemId;

            await db.SaveChangesAsync();

            // Reload it back with includes
            var reloaded = await db.ScheduledInstances
                .Include(si => si.Category)
                .Include(si => si.ListItem)
                    .ThenInclude(li => li!.Card)
                        .ThenInclude(c => c!.Category)
                .FirstAsync(si => si.Id == id);

            return Results.Ok(ToInstanceDto(reloaded));
        });

        // DELETE /api/scheduled-instances/{id}
        instanceGroup.MapDelete("/{id:int}", async (int id, LifePlannerDbContext db) =>
        {
            var inst = await db.ScheduledInstances.FirstOrDefaultAsync(s => s.Id == id);
            if (inst is null) return Results.NotFound();

            db.ScheduledInstances.Remove(inst);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
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
        WhiteboardX = c.WhiteboardX,
        WhiteboardY = c.WhiteboardY,
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
        UserId = inst.UserId,
        ListItemId = inst.ListItemId,
        CategoryId = inst.CategoryId,
        Title = inst.ListItem?.Text ?? inst.Title,
        Description = inst.Description,
        Type = inst.Type,
        StartTime = inst.StartTime,
        EndTime = inst.EndTime,
        Category = inst.Category != null ? new CategoryDto
        {
            Id = inst.Category.Id,
            Name = inst.Category.Name,
            Color = inst.Category.Color
        } : (inst.ListItem?.Card?.Category != null ? new CategoryDto
        {
            Id = inst.ListItem.Card.Category.Id,
            Name = inst.ListItem.Card.Category.Name,
            Color = inst.ListItem.Card.Category.Color
        } : null),
        ParentCardTitle = inst.ListItem?.Card?.Title,
        IntegrationSource = inst.ListItem?.Card?.IntegrationSource
    };
}
