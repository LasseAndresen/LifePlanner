namespace LifePlanner.Api.Models;

public class CardDto
{

    public int Id { get; set; }
    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public bool IsChecklist { get; set; }
    public List<ListItemDto> ListItems { get; set; } = new();
    public int CategoryId { get; set; }
    public CategoryDto? Category { get; set; }
    public int UserId { get; set; }
}

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}
