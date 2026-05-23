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
    }
}

public record ConnectRequest(string Provider);
public record ImportGoogleTasksRequest(List<string> ExternalIds);
