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
            }

            return Results.Ok(user);
        }).WithTags("Auth");
    }
}

public record AuthRequest(string IdToken);
