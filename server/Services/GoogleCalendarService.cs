using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public class GoogleCalendarService : IGoogleCalendarService
{
    public async Task<Events> GetUpcomingEventsAsync(User user, DateTime? start = null, DateTime? end = null)
    {
        if (string.IsNullOrEmpty(user.GoogleAccessToken))
            throw new UnauthorizedAccessException("User has not connected their Google Calendar.");
            
        var credential = GoogleCredential.FromAccessToken(user.GoogleAccessToken);
        
        var service = new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "LifePlanner"
        });

        var request = service.Events.List("primary");
        request.TimeMinDateTimeOffset = start ?? DateTime.UtcNow;
        request.TimeMaxDateTimeOffset = end ?? DateTime.UtcNow.AddDays(30);
        request.ShowDeleted = false;
        request.SingleEvents = true;
        request.OrderBy = EventsResource.ListRequest.OrderByEnum.StartTime;

        return await request.ExecuteAsync();
    }
}
