using System;

namespace LifePlanner.Api.Models;

public class Feedback
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string Type { get; set; } = string.Empty; // "BugReport", "FeatureRequest", "Integration", "General"
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "New"; // "New", "UnderReview", "Planned", "Completed", "Closed"
    public string? AdminNotes { get; set; }

    // Navigation property
    public User? User { get; set; }
}
