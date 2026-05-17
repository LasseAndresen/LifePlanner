namespace LifePlanner.Api.Models;

public class ListItem
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    
    // Foreign Key
    public int CardId { get; set; }
    public Card? Card { get; set; }
}
