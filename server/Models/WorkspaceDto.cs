using System.Collections.Generic;

namespace LifePlanner.Api.Models;

public class WorkspaceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<WorkspaceMemberDto> Members { get; set; } = new();
}

public class WorkspaceMemberDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public record CreateWorkspaceRequest(string Name, int UserId);
public record InviteUserRequest(string Email);
public record JoinWorkspaceRequest(string Token, int UserId);
public record TransferOwnershipRequest(int NewOwnerId, int RequesterId);
