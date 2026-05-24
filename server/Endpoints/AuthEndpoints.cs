using System;
using System.Linq;
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
        app.MapPost("/api/auth/me", async (AuthRequest request, IUserRepository userRepo, ICategoryRepository categoryRepo, IConfiguration config) =>
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

            var adminEmails = config.GetSection("AdminSettings:AdminEmails").Get<string[]>() ?? Array.Empty<string>();
            var isAdmin = adminEmails.Contains(payload.Email, StringComparer.OrdinalIgnoreCase);

            var user = await userRepo.GetByGoogleAuthIdAsync(payload.Subject);

            if (user is null)
            {
                user = new User
                {
                    Name = payload.Name,
                    Email = payload.Email,
                    GoogleAuthId = payload.Subject,
                    GoogleAccessToken = request.AccessToken,
                    GoogleRefreshToken = request.RefreshToken,
                    GoogleTokenExpiration = request.ExpiresIn.HasValue ? DateTime.UtcNow.AddSeconds(request.ExpiresIn.Value) : null,
                    IsAdmin = isAdmin
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
            else
            {
                // Always sync admin status based on configuration
                user.IsAdmin = isAdmin;

                if (!string.IsNullOrEmpty(request.AccessToken))
                {
                    // Update tokens if they are provided during login
                    user.GoogleAccessToken = request.AccessToken;
                    if (!string.IsNullOrEmpty(request.RefreshToken))
                    {
                        user.GoogleRefreshToken = request.RefreshToken;
                    }
                    if (request.ExpiresIn.HasValue)
                    {
                        user.GoogleTokenExpiration = DateTime.UtcNow.AddSeconds(request.ExpiresIn.Value);
                    }
                }
                await userRepo.UpdateAsync(user);
            }

            return Results.Ok(user);
        }).WithTags("Auth");
    }
}

public record AuthRequest(string IdToken, string? AccessToken = null, string? RefreshToken = null, int? ExpiresIn = null);
