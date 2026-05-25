using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public interface IIntegrationService
{
    Task<IntegrationStatusDto> GetStatusAsync(int userId);
    Task<IntegrationStatusDto> ConnectAsync(int userId, string provider);
    Task<IntegrationStatusDto> DisconnectAsync(int userId, string provider);
    
    // Google Tasks specific
    Task<List<GoogleTaskListDto>> GetGoogleTaskListsAsync(int userId);
    Task<List<CardDto>> ImportGoogleTaskListsAsync(int userId, List<string> externalIds);
    Task<List<CardDto>> SyncGoogleTasksAsync(int userId);
    
    // Microsoft TODO specific
    Task<CardDto> SyncMicrosoftTodoAsync(int userId);
}

public record IntegrationStatusDto(bool MicrosoftTodoConnected, bool GoogleTasksConnected);

public class GoogleTaskListDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<string> Items { get; set; } = new();
    public bool IsImported { get; set; }
}
