using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using LifePlanner.Api.Models;
using LifePlanner.Api.Services;

namespace LifePlanner.Api.Endpoints;

public static class WorkspaceEndpoints
{
    public static void MapWorkspaceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/workspaces").WithTags("Workspaces");

        // GET /api/workspaces/user/{userId}
        app.MapGet("/api/workspaces/user/{userId:int}", async (int userId, IWorkspaceService workspaceService) =>
        {
            var result = await workspaceService.GetWorkspacesByUserIdAsync(userId);
            return Results.Ok(result);
        });

        // POST /api/workspaces
        group.MapPost("/", async (CreateWorkspaceRequest request, IWorkspaceService workspaceService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.UserId <= 0)
            {
                return Results.BadRequest("Invalid workspace name or user ID.");
            }

            var result = await workspaceService.CreateWorkspaceAsync(request);
            return Results.Created($"/api/workspaces/{result.Id}", result);
        });

        // POST /api/workspaces/{workspaceId}/invite
        group.MapPost("/{workspaceId:int}/invite", async (int workspaceId, InviteUserRequest request, IWorkspaceService workspaceService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return Results.BadRequest("Email is required.");
            }

            try
            {
                var result = await workspaceService.InviteUserAsync(workspaceId, request);
                if (result == null)
                {
                    return Results.NotFound(new { detail = $"User with email '{request.Email}' not found." });
                }
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { detail = ex.Message });
            }
        });

        // DELETE /api/workspaces/{workspaceId}/users/{userId}
        group.MapDelete("/{workspaceId:int}/users/{userId:int}", async (int workspaceId, int userId, int? requesterId, IWorkspaceService workspaceService) =>
        {
            try
            {
                var success = await workspaceService.RemoveMemberAsync(workspaceId, userId, requesterId);
                if (!success)
                {
                    return Results.NotFound("Membership not found.");
                }
                return Results.NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.BadRequest(new { detail = ex.Message });
            }
        });

        // POST /api/workspaces/{workspaceId}/invite-token
        group.MapPost("/{workspaceId:int}/invite-token", async (int workspaceId, IWorkspaceService workspaceService) =>
        {
            var token = await workspaceService.GetInviteTokenAsync(workspaceId);
            if (token == null)
            {
                return Results.NotFound("Workspace not found.");
            }
            return Results.Ok(new { inviteToken = token });
        });

        // POST /api/workspaces/join
        group.MapPost("/join", async (JoinWorkspaceRequest request, IWorkspaceService workspaceService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Token) || request.UserId <= 0)
            {
                return Results.BadRequest("Token and UserId are required.");
            }

            var result = await workspaceService.JoinWorkspaceAsync(request);
            if (result == null)
            {
                return Results.NotFound(new { detail = "Invalid invite link or workspace not found." });
            }
            return Results.Ok(result);
        });

        // POST /api/workspaces/{workspaceId}/transfer-ownership
        group.MapPost("/{workspaceId:int}/transfer-ownership", async (int workspaceId, TransferOwnershipRequest request, IWorkspaceService workspaceService) =>
        {
            if (request.NewOwnerId <= 0 || request.RequesterId <= 0)
            {
                return Results.BadRequest("Invalid request parameters.");
            }

            try
            {
                await workspaceService.TransferOwnershipAsync(workspaceId, request);
                return Results.Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.BadRequest(new { detail = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { detail = ex.Message });
            }
        });

        // PUT /api/workspaces/{workspaceId}
        group.MapPut("/{workspaceId:int}", async (int workspaceId, RenameWorkspaceRequest request, IWorkspaceService workspaceService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.RequesterId <= 0)
            {
                return Results.BadRequest("Invalid workspace name or requester ID.");
            }

            try
            {
                var result = await workspaceService.RenameWorkspaceAsync(workspaceId, request);
                if (result == null)
                {
                    return Results.NotFound("Workspace not found.");
                }
                return Results.Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.BadRequest(new { detail = ex.Message });
            }
        });
    }
}
