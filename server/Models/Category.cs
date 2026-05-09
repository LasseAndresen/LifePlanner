namespace LifePlanner.Api.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#FFFFFF";
    
    // Foreign Key
    public int UserId { get; set; }
    public User? User { get; set; }
    
    // Navigation property
    public ICollection<Card> Cards { get; set; } = new List<Card>();
}
