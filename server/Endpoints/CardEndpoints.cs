using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using LifePlanner.Api.Models;
using LifePlanner.Api.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LifePlanner.Api.Endpoints;

public static class CardEndpoints
{
    public static void MapCardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cards").WithTags("Cards");

        // Get all cards for a specific workspace
        app.MapGet("/api/workspaces/{workspaceId:int}/cards", async (int workspaceId, ICardService cardService) =>
        {
            var result = await cardService.GetCardsByWorkspaceIdAsync(workspaceId);
            return Results.Ok(result);
        }).WithTags("Cards");

        // POST /api/cards
        group.MapPost("/", async (Card card, ICardService cardService) =>
        {
            var result = await cardService.CreateCardAsync(card);
            if (result == null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Card", new[] { "Title, WorkspaceId, and CategoryId are required." } }
                });
            }
            return Results.Created($"/api/cards/{result.Id}", result);
        });

        // PUT /api/cards/{id}
        group.MapPut("/{id:int}", async (int id, Card updatedCard, ICardService cardService) =>
        {
            var result = await cardService.UpdateCardAsync(id, updatedCard);
            if (result == null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Card", new[] { "Title and CategoryId are required, or the Card was not found." } }
                });
            }
            return Results.Ok(result);
        });

        // DELETE /api/cards/{id}
        group.MapDelete("/{id:int}", async (int id, ICardService cardService) =>
        {
            var success = await cardService.DeleteCardAsync(id);
            if (!success) return Results.NotFound();
            return Results.NoContent();
        });

        // POST /api/cards/reorder
        group.MapPost("/reorder", async (List<ReorderCardsDto> reordered, ICardService cardService) =>
        {
            await cardService.ReorderCardsAsync(reordered);
            return Results.Ok();
        }).WithTags("Cards");

        // --- List Item endpoints ---

        // POST /api/cards/{cardId}/items
        group.MapPost("/{cardId:int}/items", async (int cardId, ListItem item, ICardService cardService) =>
        {
            var result = await cardService.AddListItemAsync(cardId, item);
            if (result == null) return Results.NotFound();
            return Results.Created($"/api/cards/{cardId}/items/{result.Id}", result);
        }).WithTags("Cards");

        // PUT /api/cards/{cardId}/items/{itemId}
        group.MapPut("/{cardId:int}/items/{itemId:int}", async (int cardId, int itemId, ListItem updatedItem, ICardService cardService) =>
        {
            var result = await cardService.UpdateListItemAsync(cardId, itemId, updatedItem);
            if (result == null) return Results.NotFound();
            return Results.Ok(result);
        }).WithTags("Cards");

        // DELETE /api/cards/{cardId}/items/{itemId}
        group.MapDelete("/{cardId:int}/items/{itemId:int}", async (int cardId, int itemId, ICardService cardService) =>
        {
            var success = await cardService.DeleteListItemAsync(cardId, itemId);
            if (!success) return Results.NotFound();
            return Results.NoContent();
        }).WithTags("Cards");

        // PUT /api/cards/{cardId}/items/reorder
        group.MapPut("/{cardId:int}/items/reorder", async (int cardId, ReorderItemsRequest request, ICardService cardService) =>
        {
            var result = await cardService.ReorderListItemsAsync(cardId, request);
            if (result == null) return Results.NotFound();
            return Results.Ok(result);
        }).WithTags("Cards");

        // --- Scheduled Instance endpoints ---

        // POST /api/cards/{cardId}/items/{itemId}/instances
        group.MapPost("/{cardId:int}/items/{itemId:int}/instances", async (int cardId, int itemId, ScheduledInstance instanceReq, ICardService cardService) =>
        {
            instanceReq.ListItemId = itemId;
            var result = await cardService.CreateScheduledInstanceAsync(instanceReq);
            if (result == null) return Results.NotFound();
            return Results.Created($"/api/cards/{cardId}/items/{itemId}/instances/{result.Id}", result);
        }).WithTags("Cards");

        // PUT /api/cards/{cardId}/items/{itemId}/instances/{instanceId}
        group.MapPut("/{cardId:int}/items/{itemId:int}/instances/{instanceId:int}", async (int cardId, int itemId, int instanceId, ScheduledInstance updatedInstance, ICardService cardService) =>
        {
            var result = await cardService.UpdateScheduledInstanceAsync(instanceId, updatedInstance);
            if (result == null) return Results.NotFound();
            return Results.Ok(result);
        }).WithTags("Cards");

        // DELETE /api/cards/{cardId}/items/{itemId}/instances/{instanceId}
        group.MapDelete("/{cardId:int}/items/{itemId:int}/instances/{instanceId:int}", async (int cardId, int itemId, int instanceId, ICardService cardService) =>
        {
            var success = await cardService.DeleteScheduledInstanceAsync(instanceId);
            if (!success) return Results.NotFound();
            return Results.NoContent();
        }).WithTags("Cards");

        // --- Flat Scheduled Instance endpoints ---

        // GET /api/workspaces/{workspaceId}/scheduled-instances
        app.MapGet("/api/workspaces/{workspaceId:int}/scheduled-instances", async (int workspaceId, ICardService cardService) =>
        {
            var result = await cardService.GetScheduledInstancesByWorkspaceIdAsync(workspaceId);
            return Results.Ok(result);
        }).WithTags("ScheduledInstances");

        var instanceGroup = app.MapGroup("/api/scheduled-instances").WithTags("ScheduledInstances");

        // POST /api/scheduled-instances
        instanceGroup.MapPost("/", async (ScheduledInstance instance, ICardService cardService) =>
        {
            var result = await cardService.CreateScheduledInstanceAsync(instance);
            if (result == null) return Results.BadRequest("WorkspaceId and UserId are required, or item not found.");
            return Results.Created($"/api/scheduled-instances/{result.Id}", result);
        });

        // PUT /api/scheduled-instances/{id}
        instanceGroup.MapPut("/{id:int}", async (int id, ScheduledInstance updatedInstance, ICardService cardService) =>
        {
            var result = await cardService.UpdateScheduledInstanceAsync(id, updatedInstance);
            if (result == null) return Results.NotFound();
            return Results.Ok(result);
        });

        // DELETE /api/scheduled-instances/{id}
        instanceGroup.MapDelete("/{id:int}", async (int id, ICardService cardService) =>
        {
            var success = await cardService.DeleteScheduledInstanceAsync(id);
            if (!success) return Results.NotFound();
            return Results.NoContent();
        });
    }
}
