using System.Collections.Generic;
using System.Threading.Tasks;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public interface IWorkspaceService
{
    Task<IEnumerable<WorkspaceDto>> GetWorkspacesByUserIdAsync(int userId);
    Task<WorkspaceDto> CreateWorkspaceAsync(CreateWorkspaceRequest request);
    Task<WorkspaceMemberDto?> InviteUserAsync(int workspaceId, InviteUserRequest request);
    Task<bool> RemoveMemberAsync(int workspaceId, int userId, int? requesterId);
    Task<string?> GetInviteTokenAsync(int workspaceId);
    Task<WorkspaceDto?> JoinWorkspaceAsync(JoinWorkspaceRequest request);
    Task<bool> TransferOwnershipAsync(int workspaceId, TransferOwnershipRequest request);
    Task<WorkspaceDto?> RenameWorkspaceAsync(int workspaceId, RenameWorkspaceRequest request);
}
