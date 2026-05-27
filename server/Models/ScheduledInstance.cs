namespace LifePlanner.Api.Models;

public class ScheduledInstance
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public bool IsCompleted { get; set; }
    
    // Direct User association (mandatory)
    public int UserId { get; set; }
    public User? User { get; set; }
    
    // Workspace association (optional for migration)
    public int? WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }
    
    // Nullable link to List Item (optional for standalone calendar items)
    public int? ListItemId { get; set; }
    public ListItem? ListItem { get; set; }
    
    // Nullable link to Category (optional for standalone calendar items)
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    
    // Metadata properties
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Type { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    
    // Google Calendar Sync Integration
    public bool IsConfirmed { get; set; } = false;
    public string? GoogleEventId { get; set; }
}

