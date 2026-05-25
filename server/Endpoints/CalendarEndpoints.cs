using LifePlanner.Api.Repositories;
using LifePlanner.Api.Services;
using LifePlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace LifePlanner.Api.Endpoints;

public static class CalendarEndpoints
{
    public static void MapCalendarEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/calendar/events/{userId:int}", async (int userId, DateTime? start, DateTime? end, IUserRepository userRepo, IGoogleCalendarService calendarService, LifePlannerDbContext db) =>
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
                var googleEvents = events.Items ?? new List<Google.Apis.Calendar.v3.Data.Event>();

                // Sync changes from Google Calendar back to LifePlanner ScheduledInstances
                var localInstances = await db.ScheduledInstances
                    .Include(si => si.ListItem)
                    .Where(si => si.UserId == userId && si.IsConfirmed && !string.IsNullOrEmpty(si.GoogleEventId))
                    .ToListAsync();

                var googleEventsMap = googleEvents.ToDictionary(e => e.Id);
                bool hasChanges = false;

                foreach (var inst in localInstances)
                {
                    if (googleEventsMap.TryGetValue(inst.GoogleEventId!, out var googleEvent))
                    {
                        // Sync Title
                        var targetTitle = googleEvent.Summary ?? string.Empty;
                        if (inst.Title != targetTitle)
                        {
                            inst.Title = targetTitle;
                            if (inst.ListItem != null && inst.ListItem.Text != targetTitle)
                            {
                                inst.ListItem.Text = targetTitle;
                            }
                            hasChanges = true;
                        }

                        // Sync Description
                        var targetDesc = googleEvent.Description;
                        if (inst.Description != targetDesc)
                        {
                            inst.Description = targetDesc;
                            hasChanges = true;
                        }

                        // Sync Dates & Times
                        if (!string.IsNullOrEmpty(googleEvent.Start?.Date))
                        {
                            // All-day event
                            if (DateTime.TryParse(googleEvent.Start.Date, out var allDayDate))
                            {
                                if (inst.Date.Date != allDayDate.Date || inst.StartTime.HasValue || inst.EndTime.HasValue)
                                {
                                    inst.Date = allDayDate;
                                    inst.StartTime = null;
                                    inst.EndTime = null;
                                    hasChanges = true;
                                }
                            }
                        }
                        else if (googleEvent.Start?.DateTimeDateTimeOffset.HasValue == true)
                        {
                            var startTime = googleEvent.Start.DateTimeDateTimeOffset.Value.DateTime;
                            var endTime = googleEvent.End?.DateTimeDateTimeOffset?.DateTime;

                            if (inst.Date.Date != startTime.Date || inst.StartTime != startTime || inst.EndTime != endTime)
                            {
                                inst.Date = startTime.Date;
                                inst.StartTime = startTime;
                                inst.EndTime = endTime;
                                hasChanges = true;
                            }
                        }
                    }
                    else
                    {
                        // If it's not in the returned google events, check if it falls inside the fetched start/end window.
                        // If it falls within the window but is not returned, it was deleted on Google Calendar.
                        var rangeStart = start ?? DateTime.UtcNow;
                        var rangeEnd = end ?? DateTime.UtcNow.AddDays(30);

                        if (inst.Date >= rangeStart && inst.Date <= rangeEnd)
                        {
                            // Revert back to Draft state locally
                            inst.IsConfirmed = false;
                            inst.GoogleEventId = null;
                            hasChanges = true;
                        }
                    }
                }

                if (hasChanges)
                {
                    await db.SaveChangesAsync();
                }

                return Results.Ok(googleEvents);
            }
            catch (Exception ex)
            {
                return Results.Problem(detail: ex.Message, title: "Error fetching Google Calendar events");
            }
        }).WithTags("Calendar");
    }
}
