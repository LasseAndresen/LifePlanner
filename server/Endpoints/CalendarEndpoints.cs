using LifePlanner.Api.Repositories;
using LifePlanner.Api.Services;

namespace LifePlanner.Api.Endpoints;

public static class CalendarEndpoints
{
    public static void MapCalendarEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/calendar/events/{userId:int}", async (int userId, DateTime? start, DateTime? end, IUserRepository userRepo, IGoogleCalendarService calendarService) =>
        {
            var user = await userRepo.GetByIdAsync(userId);
            if (user is null) return Results.NotFound();

            if (string.IsNullOrEmpty(user.GoogleAccessToken))
            {
                return Results.BadRequest("User has not connected Google Calendar.");
            }

            try
            {
                var events = await calendarService.GetUpcomingEventsAsync(user, start, end);
                return Results.Ok(events.Items);
            }
            catch (Exception ex)
            {
                return Results.Problem(detail: ex.Message, title: "Error fetching Google Calendar events");
            }
        }).WithTags("Calendar");
    }
}
