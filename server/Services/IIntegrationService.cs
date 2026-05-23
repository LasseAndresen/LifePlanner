using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public interface IIntegrationService
{
    Task<IntegrationStatusDto> GetStatusAsync(int userId);
    Task<IntegrationStatusDto> ConnectAsync(int userId, string provider);
    Task<IntegrationStatusDto> DisconnectAsync(int userId, string provider);
    
    // Google Keep specific
    Task<List<KeepNoteDto>> GetKeepNotesAsync(int userId);
    Task<List<CardDto>> ImportKeepNotesAsync(int userId, List<string> externalIds);
    
    // Microsoft TODO specific
    Task<CardDto> SyncMicrosoftTodoAsync(int userId);
}

public record IntegrationStatusDto(bool MicrosoftTodoConnected, bool GoogleKeepConnected);

public class KeepNoteDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<string> Items { get; set; } = new();
    public bool IsImported { get; set; }
}
