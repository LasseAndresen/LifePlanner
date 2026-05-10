namespace LifePlanner.Api.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? GoogleAuthId { get; set; }
    
    // Navigation properties
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    
    public ICollection<Card> Cards { get; set; } = new List<Card>();
}
