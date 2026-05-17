namespace LifePlanner.Api.Models;

public class ScheduledInstance
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public bool IsCompleted { get; set; }
    
    // Foreign Key
    public int ListItemId { get; set; }
    public ListItem? ListItem { get; set; }
}
