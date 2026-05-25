namespace LifePlanner.Api.Models;

public class ListItemDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int CardId { get; set; }
    public string? IntegrationExternalId { get; set; }
    public string? Position { get; set; }
    public List<ScheduledInstanceDto> ScheduledInstances { get; set; } = new();
}
