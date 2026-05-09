namespace LifePlanner.Api.Models;

public class Card
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    public DateTime? ScheduledDate { get; set; }
    
    // Foreign Keys
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    
    public int UserId { get; set; }
    public User? User { get; set; }
}
