using System.Collections.Generic;

namespace LifePlanner.Api.Models;

public class Workspace
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? InviteToken { get; set; }

    // Navigation properties
    public ICollection<WorkspaceUser> WorkspaceUsers { get; set; } = new List<WorkspaceUser>();
    public ICollection<Card> Cards { get; set; } = new List<Card>();
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<ScheduledInstance> ScheduledInstances { get; set; } = new List<ScheduledInstance>();
}
