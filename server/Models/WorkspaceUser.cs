namespace LifePlanner.Api.Models;

public class WorkspaceUser
{
    public int Id { get; set; }
    
    public int WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }
    
    public int UserId { get; set; }
    public User? User { get; set; }
    
    public string Role { get; set; } = "Member"; // "Owner" or "Member"
}
