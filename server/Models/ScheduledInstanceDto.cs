namespace LifePlanner.Api.Models;

public class ScheduledInstanceDto
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public bool IsCompleted { get; set; }
    
    // Direct User association
    public int UserId { get; set; }
    public int WorkspaceId { get; set; }
    
    // Nullable link to List Item
    public int? ListItemId { get; set; }
    
    // Nullable link to Category
    public int? CategoryId { get; set; }
    public CategoryDto? Category { get; set; }
    
    // Metadata properties
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Type { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    
    // Google Calendar Sync Integration
    public bool IsConfirmed { get; set; }
    public string? GoogleEventId { get; set; }
    
    // Auxiliary fields for UI
    public string? ParentCardTitle { get; set; }
    public string? IntegrationSource { get; set; }
}
