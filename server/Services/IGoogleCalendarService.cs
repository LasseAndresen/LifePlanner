using Google.Apis.Calendar.v3.Data;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public interface IGoogleCalendarService
{
    Task<Events> GetUpcomingEventsAsync(User user, DateTime? start = null, DateTime? end = null);
}
