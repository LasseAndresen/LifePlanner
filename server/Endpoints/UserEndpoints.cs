using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;

namespace LifePlanner.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(user.Name) || string.IsNullOrWhiteSpace(user.Email))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "User", new[] { "Name and Email are required." } }
                });
            }

            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
