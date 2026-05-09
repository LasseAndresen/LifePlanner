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
            var cards = await db.Cards.Where(c => c.UserId == userId).ToListAsync();
            return Results.Ok(cards);
        }).WithTags("Cards");

        group.MapPost("/", async (Card card, LifePlannerDbContext db) =>
        {
            db.Cards.Add(card);
            await db.SaveChangesAsync();
            return Results.Created($"/api/cards/{card.Id}", card);
        });

        group.MapPut("/{id}", async (int id, Card updatedCard, LifePlannerDbContext db) =>
        {
            var card = await db.Cards.FindAsync(id);
            if (card is null) return Results.NotFound();

            card.Title = updatedCard.Title;
            card.Description = updatedCard.Description;
            card.CategoryId = updatedCard.CategoryId;
            card.ScheduledDate = updatedCard.ScheduledDate;
            
            await db.SaveChangesAsync();
            return Results.NoContent();
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
