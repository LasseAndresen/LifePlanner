using Google.Apis.Auth;
using LifePlanner.Api.Models;
using LifePlanner.Api.Repositories;

namespace LifePlanner.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        // Called by the frontend immediately after a successful Google login.
        // Validates the Google ID token, then creates or retrieves the corresponding
        // user record from the database.
        app.MapPost("/api/auth/me", async (AuthRequest request, IUserRepository userRepo, ICategoryRepository categoryRepo) =>
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

            var user = await userRepo.GetByGoogleAuthIdAsync(payload.Subject);

            if (user is null)
            {
                user = new User
                {
                    Name = payload.Name,
                    Email = payload.Email,
                    GoogleAuthId = payload.Subject
                };
                await userRepo.AddAsync(user);

                // Seed default categories so the card form is never empty on first login
                await categoryRepo.AddRangeAsync(new[]
                {
                    new Category { Name = "Ideas",    Color = "#3b82f6", UserId = user.Id },
                    new Category { Name = "Chores",   Color = "#10b981", UserId = user.Id },
                    new Category { Name = "Events",   Color = "#f59e0b", UserId = user.Id },
                    new Category { Name = "Personal", Color = "#ec4899", UserId = user.Id }
                });
            }

            return Results.Ok(user);
        }).WithTags("Auth");
    }
}

public record AuthRequest(string IdToken);
