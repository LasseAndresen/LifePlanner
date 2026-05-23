using LifePlanner.Api.Services;

namespace LifePlanner.Api.Endpoints;

public static class IntegrationEndpoints
{
    public static void MapIntegrationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/integrations").WithTags("Integrations");

        group.MapGet("/status/{userId:int}", async (int userId, IIntegrationService service) =>
        {
            var status = await service.GetStatusAsync(userId);
            return Results.Ok(status);
        });

        group.MapPost("/connect/{userId:int}", async (int userId, ConnectRequest request, IIntegrationService service) =>
        {
            if (string.IsNullOrWhiteSpace(request.Provider))
            {
                return Results.BadRequest("Provider is required.");
            }
            try
            {
                var status = await service.ConnectAsync(userId, request.Provider);
                return Results.Ok(status);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        group.MapPost("/disconnect/{userId:int}", async (int userId, ConnectRequest request, IIntegrationService service) =>
        {
            if (string.IsNullOrWhiteSpace(request.Provider))
            {
                return Results.BadRequest("Provider is required.");
            }
            try
            {
                var status = await service.DisconnectAsync(userId, request.Provider);
                return Results.Ok(status);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        group.MapGet("/google-tasks/lists/{userId:int}", async (int userId, IIntegrationService service) =>
        {
            try
            {
                var lists = await service.GetGoogleTaskListsAsync(userId);
                return Results.Ok(lists);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        group.MapPost("/google-tasks/import/{userId:int}", async (int userId, ImportGoogleTasksRequest request, IIntegrationService service) =>
        {
            try
            {
                var cards = await service.ImportGoogleTaskListsAsync(userId, request.ExternalIds);
                return Results.Ok(cards);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        group.MapPost("/todo/sync/{userId:int}", async (int userId, IIntegrationService service) =>
        {
            try
            {
                var card = await service.SyncMicrosoftTodoAsync(userId);
                return Results.Ok(card);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        group.MapGet("/connect/microsoft/login", (int state, IMicrosoftTodoService service) =>
        {
            return Results.Redirect(service.GetAuthorizationUrl(state));
        });

        group.MapGet("/microsoft/callback", async (string code, string state, IMicrosoftTodoService todoService, LifePlanner.Api.Data.LifePlannerDbContext context) =>
        {
            if (!int.TryParse(state, out var userId))
            {
                return Results.Redirect("http://localhost:4200/?integration=microsoft-error&message=Invalid+state+parameter");
            }

            var user = await context.Users.FindAsync(userId);
            if (user == null)
            {
                return Results.Redirect("http://localhost:4200/?integration=microsoft-error&message=User+not+found");
            }

            try
            {
                var (accessToken, refreshToken, expiresIn) = await todoService.ExchangeCodeForTokensAsync(code);
                
                user.MicrosoftAccessToken = accessToken;
                user.MicrosoftRefreshToken = refreshToken;
                user.MicrosoftTokenExpiration = DateTime.UtcNow.AddSeconds(expiresIn);
                user.MicrosoftTodoConnected = true;

                context.Users.Update(user);
                await context.SaveChangesAsync();

                return Results.Redirect("http://localhost:4200/?integration=microsoft-success");
            }
            catch (Exception ex)
            {
                return Results.Redirect($"http://localhost:4200/?integration=microsoft-error&message={Uri.EscapeDataString(ex.Message)}");
            }
        });
    }
}

public record ConnectRequest(string Provider);
public record ImportGoogleTasksRequest(List<string> ExternalIds);
