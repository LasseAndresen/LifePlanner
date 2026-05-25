using System.Linq;
using System.Net.Http.Headers;
using System.Text.Json;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LifePlanner.Api.Services;

public class MicrosoftTodoService : IMicrosoftTodoService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly LifePlannerDbContext _context;
    private readonly ILogger<MicrosoftTodoService> _logger;

    public MicrosoftTodoService(HttpClient httpClient, IConfiguration config, LifePlannerDbContext context, ILogger<MicrosoftTodoService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _context = context;
        _logger = logger;
    }

    public string GetAuthorizationUrl(int userId)
    {
        var clientId = _config["Microsoft:ClientId"];
        var redirectUri = Uri.EscapeDataString(_config["Microsoft:RedirectUri"]!);
        var scopes = Uri.EscapeDataString("offline_access Tasks.ReadWrite");

        return $"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&response_mode=query&scope={scopes}&state={userId}";
    }

    public async Task<(string AccessToken, string RefreshToken, int ExpiresIn)> ExchangeCodeForTokensAsync(string code)
    {
        _logger.LogInformation("Exchanging authorization code for Microsoft Graph tokens.");
        var values = new Dictionary<string, string>
        {
            { "client_id", _config["Microsoft:ClientId"]! },
            { "client_secret", _config["Microsoft:ClientSecret"]! },
            { "code", code },
            { "redirect_uri", _config["Microsoft:RedirectUri"]! },
            { "grant_type", "authorization_code" }
        };

        var response = await _httpClient.PostAsync("https://login.microsoftonline.com/common/oauth2/v2.0/token", new FormUrlEncodedContent(values));
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to exchange code for tokens. Status: {StatusCode}, Error: {Error}", response.StatusCode, errContent);
        }
        response.EnsureSuccessStatusCode();

        using var jsonDoc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var root = jsonDoc.RootElement;

        _logger.LogInformation("Successfully exchanged code for Microsoft Graph tokens.");
        return (
            root.GetProperty("access_token").GetString()!,
            root.GetProperty("refresh_token").GetString()!,
            root.GetProperty("expires_in").GetInt32()
        );
    }

    public async Task<string> GetOrRefreshTokenAsync(User user)
    {
        if (user.MicrosoftTokenExpiration.HasValue && user.MicrosoftTokenExpiration.Value > DateTime.UtcNow.AddMinutes(5))
        {
            _logger.LogDebug("Using existing active Microsoft Access Token for User {UserId}.", user.Id);
            return user.MicrosoftAccessToken!;
        }

        if (string.IsNullOrEmpty(user.MicrosoftRefreshToken))
        {
            _logger.LogWarning("Microsoft Refresh Token is missing for User {UserId}.", user.Id);
            throw new UnauthorizedAccessException("Microsoft Account is disconnected or lacks a refresh token.");
        }

        _logger.LogInformation("Refreshing Microsoft Graph access token for User {UserId}.", user.Id);
        var values = new Dictionary<string, string>
        {
            { "client_id", _config["Microsoft:ClientId"]! },
            { "client_secret", _config["Microsoft:ClientSecret"]! },
            { "refresh_token", user.MicrosoftRefreshToken },
            { "grant_type", "refresh_token" }
        };

        var response = await _httpClient.PostAsync("https://login.microsoftonline.com/common/oauth2/v2.0/token", new FormUrlEncodedContent(values));
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to refresh Microsoft Graph token for User {UserId}. Status: {StatusCode}, Error: {Error}", user.Id, response.StatusCode, errContent);
        }
        response.EnsureSuccessStatusCode();

        using var jsonDoc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var root = jsonDoc.RootElement;

        user.MicrosoftAccessToken = root.GetProperty("access_token").GetString();
        user.MicrosoftRefreshToken = root.GetProperty("refresh_token").GetString();
        user.MicrosoftTokenExpiration = DateTime.UtcNow.AddSeconds(root.GetProperty("expires_in").GetInt32());

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Successfully refreshed Microsoft Graph access token for User {UserId}.", user.Id);
        return user.MicrosoftAccessToken!;
    }

    public async Task<List<MicrosoftTodoListDto>> GetTodoListsAsync(string accessToken)
    {
        _logger.LogDebug("Fetching Microsoft To-Do lists.");
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://graph.microsoft.com/v1.0/me/todo/lists");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to get Microsoft To-Do lists. Status: {StatusCode}, Error: {Error}", response.StatusCode, errContent);
        }
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);
        
        var list = new List<MicrosoftTodoListDto>();
        foreach (var item in json.RootElement.GetProperty("value").EnumerateArray())
        {
            list.Add(new MicrosoftTodoListDto(
                item.GetProperty("id").GetString()!,
                item.GetProperty("displayName").GetString()!
            ));
        }
        _logger.LogInformation("Fetched {Count} Microsoft To-Do lists.", list.Count);
        return list;
    }

    public async Task<List<MicrosoftTodoTaskDto>> GetTasksAsync(string accessToken, string listId)
    {
        _logger.LogDebug("Fetching Microsoft To-Do tasks for List {ListId}.", listId);
        var url = $"https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to get Microsoft To-Do tasks for List {ListId}. Status: {StatusCode}, Error: {Error}", listId, response.StatusCode, errContent);
        }
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);

        var list = new List<MicrosoftTodoTaskDto>();
        foreach (var item in json.RootElement.GetProperty("value").EnumerateArray())
        {
            DateTimeOffset? createdDateTime = null;
            if (item.TryGetProperty("createdDateTime", out var createdProp) &&
                createdProp.ValueKind != JsonValueKind.Null &&
                DateTimeOffset.TryParse(createdProp.GetString(), out var parsed))
            {
                createdDateTime = parsed;
            }

            list.Add(new MicrosoftTodoTaskDto(
                item.GetProperty("id").GetString()!,
                item.GetProperty("title").GetString()!,
                item.GetProperty("status").GetString()!,
                createdDateTime
            ));
        }
        _logger.LogInformation("Fetched {Count} tasks from Microsoft To-Do List {ListId}.", list.Count, listId);
        return list.OrderByDescending(t => t.CreatedDateTime ?? DateTimeOffset.MinValue).ToList();
    }

    public async Task UpdateTaskAsync(string accessToken, string listId, string taskId, string? title = null, bool? isCompleted = null)
    {
        _logger.LogInformation("Updating Microsoft To-Do task {TaskId} in List {ListId}. Title: '{Title}', IsCompleted: {IsCompleted}", taskId, listId, title, isCompleted);
        var url = $"https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks/{taskId}";
        using var request = new HttpRequestMessage(HttpMethod.Patch, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var body = new Dictionary<string, object>();
        if (title != null)
        {
            body["title"] = title;
        }
        if (isCompleted.HasValue)
        {
            body["status"] = isCompleted.Value ? "completed" : "notStarted";
        }

        var jsonContent = JsonSerializer.Serialize(body);
        request.Content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to update Microsoft To-Do task {TaskId} in List {ListId}. Status: {StatusCode}, Error: {Error}", taskId, listId, response.StatusCode, errContent);
        }
        response.EnsureSuccessStatusCode();
        _logger.LogInformation("Successfully updated Microsoft To-Do task {TaskId}.", taskId);
    }

    public async Task<string> CreateTaskAsync(string accessToken, string listId, string title)
    {
        _logger.LogInformation("Creating new Microsoft To-Do task '{Title}' in List {ListId}.", title, listId);
        var url = $"https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks";
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var body = new { title = title };
        var jsonContent = JsonSerializer.Serialize(body);
        request.Content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to create Microsoft To-Do task '{Title}' in List {ListId}. Status: {StatusCode}, Error: {Error}", title, listId, response.StatusCode, errContent);
        }
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);
        var createdId = json.RootElement.GetProperty("id").GetString()!;
        _logger.LogInformation("Successfully created Microsoft To-Do task with ID {TaskId}.", createdId);
        return createdId;
    }

    public async Task DeleteTaskAsync(string accessToken, string listId, string taskId)
    {
        _logger.LogInformation("Deleting Microsoft To-Do task {TaskId} from List {ListId}.", taskId, listId);
        var url = $"https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks/{taskId}";
        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to delete Microsoft To-Do task {TaskId} from List {ListId}. Status: {StatusCode}, Error: {Error}", taskId, listId, response.StatusCode, errContent);
        }
        response.EnsureSuccessStatusCode();
        _logger.LogInformation("Successfully deleted Microsoft To-Do task {TaskId}.", taskId);
    }
}
