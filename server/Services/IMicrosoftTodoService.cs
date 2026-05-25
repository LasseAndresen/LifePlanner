using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public interface IMicrosoftTodoService
{
    string GetAuthorizationUrl(int userId);
    Task<(string AccessToken, string RefreshToken, int ExpiresIn)> ExchangeCodeForTokensAsync(string code);
    Task<string> GetOrRefreshTokenAsync(User user);
    Task<List<MicrosoftTodoListDto>> GetTodoListsAsync(string accessToken);
    Task<List<MicrosoftTodoTaskDto>> GetTasksAsync(string accessToken, string listId);
    Task UpdateTaskAsync(string accessToken, string listId, string taskId, string? title = null, bool? isCompleted = null);
    Task<string> CreateTaskAsync(string accessToken, string listId, string title);
    Task DeleteTaskAsync(string accessToken, string listId, string taskId);
}

public record MicrosoftTodoListDto(string Id, string DisplayName);
public record MicrosoftTodoTaskDto(string Id, string Title, string Status, DateTimeOffset? CreatedDateTime);
