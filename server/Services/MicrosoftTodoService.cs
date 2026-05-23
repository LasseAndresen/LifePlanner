using System.Net.Http.Headers;
using System.Text.Json;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.Extensions.Configuration;

namespace LifePlanner.Api.Services;

public class MicrosoftTodoService : IMicrosoftTodoService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly LifePlannerDbContext _context;

    public MicrosoftTodoService(HttpClient httpClient, IConfiguration config, LifePlannerDbContext context)
    {
        _httpClient = httpClient;
        _config = config;
        _context = context;
    }

    public string GetAuthorizationUrl(int userId)
    {
        var clientId = _config["Microsoft:ClientId"];
        var redirectUri = Uri.EscapeDataString(_config["Microsoft:RedirectUri"]!);
        var scopes = Uri.EscapeDataString("offline_access Tasks.Read");

        return $"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&response_mode=query&scope={scopes}&state={userId}";
    }

    public async Task<(string AccessToken, string RefreshToken, int ExpiresIn)> ExchangeCodeForTokensAsync(string code)
    {
        var values = new Dictionary<string, string>
        {
            { "client_id", _config["Microsoft:ClientId"]! },
            { "client_secret", _config["Microsoft:ClientSecret"]! },
            { "code", code },
            { "redirect_uri", _config["Microsoft:RedirectUri"]! },
            { "grant_type", "authorization_code" }
        };

        var response = await _httpClient.PostAsync("https://login.microsoftonline.com/common/oauth2/v2.0/token", new FormUrlEncodedContent(values));
        response.EnsureSuccessStatusCode();

        using var jsonDoc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var root = jsonDoc.RootElement;

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
            return user.MicrosoftAccessToken!;
        }

        if (string.IsNullOrEmpty(user.MicrosoftRefreshToken))
        {
            throw new UnauthorizedAccessException("Microsoft Account is disconnected or lacks a refresh token.");
        }

        // Refresh token
        var values = new Dictionary<string, string>
        {
            { "client_id", _config["Microsoft:ClientId"]! },
            { "client_secret", _config["Microsoft:ClientSecret"]! },
            { "refresh_token", user.MicrosoftRefreshToken },
            { "grant_type", "refresh_token" }
        };

        var response = await _httpClient.PostAsync("https://login.microsoftonline.com/common/oauth2/v2.0/token", new FormUrlEncodedContent(values));
        response.EnsureSuccessStatusCode();

        using var jsonDoc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var root = jsonDoc.RootElement;

        user.MicrosoftAccessToken = root.GetProperty("access_token").GetString();
        user.MicrosoftRefreshToken = root.GetProperty("refresh_token").GetString();
        user.MicrosoftTokenExpiration = DateTime.UtcNow.AddSeconds(root.GetProperty("expires_in").GetInt32());

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return user.MicrosoftAccessToken!;
    }

    public async Task<List<MicrosoftTodoListDto>> GetTodoListsAsync(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://graph.microsoft.com/v1.0/me/todo/lists");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        
        var response = await _httpClient.SendAsync(request);
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
        return list;
    }

    public async Task<List<MicrosoftTodoTaskDto>> GetTasksAsync(string accessToken, string listId)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);

        var list = new List<MicrosoftTodoTaskDto>();
        foreach (var item in json.RootElement.GetProperty("value").EnumerateArray())
        {
            list.Add(new MicrosoftTodoTaskDto(
                item.GetProperty("id").GetString()!,
                item.GetProperty("title").GetString()!,
                item.GetProperty("status").GetString()!
            ));
        }
        return list;
    }
}
