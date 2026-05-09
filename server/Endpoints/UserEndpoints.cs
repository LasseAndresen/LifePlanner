using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/{id}", async (int id, LifePlannerDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, LifePlannerDbContext db) =>
        {
            db.Users.Add(user);
            await db.SaveChangesAsync();
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
