using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public class GoogleCalendarService : IGoogleCalendarService
{
    private CalendarService GetService(User user)
    {
        if (string.IsNullOrEmpty(user.GoogleAccessToken))
            throw new UnauthorizedAccessException("User has not connected their Google Calendar.");
            
        var credential = GoogleCredential.FromAccessToken(user.GoogleAccessToken);
        
        return new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "LifePlanner"
        });
    }

    private async Task<T> ExecuteWithAuthHandlingAsync<T>(Func<Task<T>> action)
    {
        try
        {
            return await action();
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            throw new UnauthorizedAccessException("Google Calendar access token has expired or is invalid.", ex);
        }
    }

    private async Task ExecuteWithAuthHandlingAsync(Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            throw new UnauthorizedAccessException("Google Calendar access token has expired or is invalid.", ex);
        }
    }

    public async Task<Events> GetUpcomingEventsAsync(User user, DateTime? start = null, DateTime? end = null)
    {
        var service = GetService(user);

        var request = service.Events.List("primary");
        request.TimeMinDateTimeOffset = start ?? DateTime.UtcNow;
        request.TimeMaxDateTimeOffset = end ?? DateTime.UtcNow.AddDays(30);
        request.ShowDeleted = false;
        request.SingleEvents = true;
        request.OrderBy = EventsResource.ListRequest.OrderByEnum.StartTime;

        return await ExecuteWithAuthHandlingAsync(() => request.ExecuteAsync());
    }

    public async Task<string> CreateEventAsync(User user, ScheduledInstance instance)
    {
        var service = GetService(user);

        var ev = new Event
        {
            Summary = instance.Title ?? "Scheduled Event",
            Description = instance.Description,
        };

        if (instance.StartTime.HasValue)
        {
            var end = instance.EndTime ?? instance.StartTime.Value.AddHours(1);
            ev.Start = new EventDateTime { DateTimeDateTimeOffset = instance.StartTime.Value };
            ev.End = new EventDateTime { DateTimeDateTimeOffset = end };
        }
        else
        {
            ev.Start = new EventDateTime { Date = instance.Date.ToString("yyyy-MM-dd") };
            ev.End = new EventDateTime { Date = instance.Date.AddDays(1).ToString("yyyy-MM-dd") };
        }

        var request = service.Events.Insert(ev, "primary");
        var createdEvent = await ExecuteWithAuthHandlingAsync(() => request.ExecuteAsync());
        return createdEvent.Id;
    }

    public async Task UpdateEventAsync(User user, ScheduledInstance instance)
    {
        if (string.IsNullOrEmpty(instance.GoogleEventId))
            return;

        var service = GetService(user);

        Event ev;
        try
        {
            ev = await ExecuteWithAuthHandlingAsync(() => service.Events.Get("primary", instance.GoogleEventId).ExecuteAsync());
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Event was deleted or not found on Google Calendar, recreate it
            var newId = await CreateEventAsync(user, instance);
            instance.GoogleEventId = newId;
            return;
        }

        ev.Summary = instance.Title ?? "Scheduled Event";
        ev.Description = instance.Description;

        if (instance.StartTime.HasValue)
        {
            var end = instance.EndTime ?? instance.StartTime.Value.AddHours(1);
            ev.Start = new EventDateTime { DateTimeDateTimeOffset = instance.StartTime.Value, Date = null };
            ev.End = new EventDateTime { DateTimeDateTimeOffset = end, Date = null };
        }
        else
        {
            ev.Start = new EventDateTime { Date = instance.Date.ToString("yyyy-MM-dd"), DateTimeDateTimeOffset = null };
            ev.End = new EventDateTime { Date = instance.Date.AddDays(1).ToString("yyyy-MM-dd"), DateTimeDateTimeOffset = null };
        }

        var request = service.Events.Update(ev, "primary", instance.GoogleEventId);
        await ExecuteWithAuthHandlingAsync(() => request.ExecuteAsync());
    }

    public async Task DeleteEventAsync(User user, string googleEventId)
    {
        if (string.IsNullOrEmpty(googleEventId))
            return;

        var service = GetService(user);

        try
        {
            var request = service.Events.Delete("primary", googleEventId);
            await ExecuteWithAuthHandlingAsync(() => request.ExecuteAsync());
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Already deleted, ignore
        }
    }
}
