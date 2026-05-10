using Google.Apis.Auth;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        // Called by the frontend immediately after a successful Google login.
        // Validates the Google ID token, then creates or retrieves the corresponding
        // user record from the database.
        app.MapPost("/api/auth/me", async (AuthRequest request, LifePlannerDbContext db) =>
        {
            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken);
            }
            catch (InvalidJwtException)
            {
                return Results.Unauthorized();
            }

            var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleAuthId == payload.Subject);

            if (user is null)
            {
                user = new User
                {
                    Name = payload.Name,
                    Email = payload.Email,
                    GoogleAuthId = payload.Subject
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();

                // Seed default categories so the card form is never empty on first login
                db.Categories.AddRange(
                    new Category { Name = "Ideas",    Color = "#3b82f6", UserId = user.Id },
                    new Category { Name = "Chores",   Color = "#10b981", UserId = user.Id },
                    new Category { Name = "Events",   Color = "#f59e0b", UserId = user.Id },
                    new Category { Name = "Personal", Color = "#ec4899", UserId = user.Id }
                );
                await db.SaveChangesAsync();
            }

            return Results.Ok(user);
        }).WithTags("Auth");
    }
}

public record AuthRequest(string IdToken);
