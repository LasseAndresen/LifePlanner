namespace LifePlanner.Api.Models;

public class ScheduledInstanceDto
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public bool IsCompleted { get; set; }
    public int ListItemId { get; set; }
}
