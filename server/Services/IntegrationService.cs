using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LifePlanner.Api.Services;

public class IntegrationService : IIntegrationService
{
    private readonly LifePlannerDbContext _context;
    private readonly IGoogleTasksService _googleTasksService;
    private readonly IMicrosoftTodoService _microsoftTodoService;
    private readonly ILogger<IntegrationService> _logger;

    public IntegrationService(
        LifePlannerDbContext context, 
        IGoogleTasksService googleTasksService, 
        IMicrosoftTodoService microsoftTodoService,
        ILogger<IntegrationService> logger)
    {
        _context = context;
        _googleTasksService = googleTasksService;
        _microsoftTodoService = microsoftTodoService;
        _logger = logger;
    }

    private static readonly List<(string Id, string Text)> MockTodoTasks = new()
    {
        ("ms-todo-1", "Buy fresh milk & oatmeal"),
        ("ms-todo-2", "Schedule annual dental cleaning"),
        ("ms-todo-3", "Prepare slide deck for Monday review"),
        ("ms-todo-4", "Renew car insurance plan"),
        ("ms-todo-5", "Pick up package from post office locker")
    };

    public async Task<IntegrationStatusDto> GetStatusAsync(int userId)
    {
        _logger.LogDebug("Retrieving integration status for User {UserId}.", userId);
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("Failed to retrieve integration status: User {UserId} not found.", userId);
            return new IntegrationStatusDto(false, false);
        }

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleTasksConnected);
    }

    public async Task<IntegrationStatusDto> ConnectAsync(int userId, string provider)
    {
        _logger.LogInformation("Attempting to connect integration provider '{Provider}' for User {UserId}.", provider, userId);
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            _logger.LogError("Connection failed: User {UserId} not found.", userId);
            throw new KeyNotFoundException("User not found");
        }

        if (provider.Equals("MicrosoftTodo", StringComparison.OrdinalIgnoreCase))
        {
            user.MicrosoftTodoConnected = true;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Microsoft To-Do connected successfully for User {UserId}. Triggering auto-sync.", userId);
            
            try
            {
                await SyncMicrosoftTodoAsync(userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Initial automatic sync failed after connecting Microsoft To-Do for User {UserId}.", userId);
            }
        }
        else if (provider.Equals("GoogleTasks", StringComparison.OrdinalIgnoreCase))
        {
            user.GoogleTasksConnected = true;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Google Tasks connected successfully for User {UserId}.", userId);
        }
        else
        {
            _logger.LogWarning("Unknown integration provider connection requested: '{Provider}' for User {UserId}.", provider, userId);
        }

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleTasksConnected);
    }

    public async Task<IntegrationStatusDto> DisconnectAsync(int userId, string provider)
    {
        _logger.LogInformation("Attempting to disconnect integration provider '{Provider}' for User {UserId}.", provider, userId);
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            _logger.LogError("Disconnection failed: User {UserId} not found.", userId);
            throw new KeyNotFoundException("User not found");
        }

        if (provider.Equals("MicrosoftTodo", StringComparison.OrdinalIgnoreCase))
        {
            user.MicrosoftTodoConnected = false;
            user.MicrosoftAccessToken = null;
            user.MicrosoftRefreshToken = null;
            user.MicrosoftTokenExpiration = null;
            
            // Delete imported MS Todo cards and orphan their scheduled instances
            var todoCards = await _context.Cards
                .Include(c => c.ListItems)
                .Where(c => c.UserId == userId && c.IntegrationSource == "MicrosoftTodo")
                .ToListAsync();

            _logger.LogInformation("Removing {CardCount} Microsoft To-Do cards and orphaning associated checklist items for User {UserId}.", todoCards.Count, userId);

            var listItemIds = todoCards.SelectMany(c => c.ListItems).Select(li => li.Id).ToList();
            if (listItemIds.Any())
            {
                var scheduledInstances = await _context.ScheduledInstances
                    .Include(si => si.ListItem)
                        .ThenInclude(li => li!.Card)
                    .Where(si => si.ListItemId.HasValue && listItemIds.Contains(si.ListItemId.Value))
                    .ToListAsync();
                
                foreach (var si in scheduledInstances)
                {
                    if (si.ListItem != null)
                    {
                        if (string.IsNullOrEmpty(si.Title))
                        {
                            si.Title = si.ListItem.Text;
                        }
                        if (!si.CategoryId.HasValue && si.ListItem.Card != null)
                        {
                            si.CategoryId = si.ListItem.Card.CategoryId;
                        }
                    }
                    si.ListItemId = null;
                }
                
                _logger.LogDebug("Orphaned {InstanceCount} scheduled instances due to Microsoft To-Do disconnect.", scheduledInstances.Count);
            }
            
            _context.Cards.RemoveRange(todoCards);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully disconnected and cleaned up Microsoft To-Do for User {UserId}.", userId);
        }
        else if (provider.Equals("GoogleTasks", StringComparison.OrdinalIgnoreCase))
        {
            user.GoogleTasksConnected = false;

            // Delete imported Google Tasks cards and orphan their scheduled instances
            var keepCards = await _context.Cards
                .Include(c => c.ListItems)
                .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleTasks")
                .ToListAsync();

            _logger.LogInformation("Removing {CardCount} Google Tasks cards and orphaning associated checklist items for User {UserId}.", keepCards.Count, userId);

            var listItemIds = keepCards.SelectMany(c => c.ListItems).Select(li => li.Id).ToList();
            if (listItemIds.Any())
            {
                var scheduledInstances = await _context.ScheduledInstances
                    .Include(si => si.ListItem)
                        .ThenInclude(li => li!.Card)
                    .Where(si => si.ListItemId.HasValue && listItemIds.Contains(si.ListItemId.Value))
                    .ToListAsync();
                
                foreach (var si in scheduledInstances)
                {
                    if (si.ListItem != null)
                    {
                        if (string.IsNullOrEmpty(si.Title))
                        {
                            si.Title = si.ListItem.Text;
                        }
                        if (!si.CategoryId.HasValue && si.ListItem.Card != null)
                        {
                            si.CategoryId = si.ListItem.Card.CategoryId;
                        }
                    }
                    si.ListItemId = null;
                }
                
                _logger.LogDebug("Orphaned {InstanceCount} scheduled instances due to Google Tasks disconnect.", scheduledInstances.Count);
            }

            _context.Cards.RemoveRange(keepCards);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully disconnected and cleaned up Google Tasks for User {UserId}.", userId);
        }
        else
        {
            _logger.LogWarning("Unknown integration provider disconnection requested: '{Provider}' for User {UserId}.", provider, userId);
        }

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleTasksConnected);
    }

    public async Task<List<GoogleTaskListDto>> GetGoogleTaskListsAsync(int userId)
    {
        _logger.LogDebug("Retrieving Google Tasks lists for User {UserId}.", userId);
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.GoogleTasksConnected)
        {
            _logger.LogError("GetGoogleTaskListsAsync failed: User {UserId} not found or Google Tasks disconnected.", userId);
            throw new InvalidOperationException("Google Tasks is not connected.");
        }

        var importedIds = await _context.Cards
            .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleTasks")
            .Select(c => c.IntegrationExternalId)
            .ToListAsync();

        var taskLists = await _googleTasksService.GetTaskListsAsync(user);
        
        var tasksQueries = taskLists.Select(async list =>
        {
            var tasks = await _googleTasksService.GetTasksAsync(user, list.Id);
            var activeTasks = tasks
                .Where(t => t.Status != "completed" && !string.IsNullOrEmpty(t.Title))
                .Select(t => t.Title)
                .ToList();

            return new GoogleTaskListDto
            {
                Id = list.Id,
                Title = list.Title,
                Items = activeTasks,
                IsImported = importedIds.Contains(list.Id)
            };
        });

        var results = await Task.WhenAll(tasksQueries);
        _logger.LogInformation("Retrieved {ListCount} task lists from Google Tasks for User {UserId}.", results.Length, userId);
        return results.ToList();
    }

    public async Task<List<CardDto>> ImportGoogleTaskListsAsync(int userId, List<string> externalIds)
    {
        _logger.LogInformation("Importing Google Tasks lists for User {UserId}. Target List IDs: {ExternalIds}", userId, string.Join(", ", externalIds));
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.GoogleTasksConnected)
        {
            _logger.LogError("ImportGoogleTaskListsAsync failed: User {UserId} not found or Google Tasks disconnected.", userId);
            throw new InvalidOperationException("Google Tasks is not connected.");
        }

        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == "Google Tasks");
        if (category == null)
        {
            _logger.LogInformation("Google Tasks category not found. Creating a default category for User {UserId}.", userId);
            category = new Category { Name = "Google Tasks", Color = "#2563eb", UserId = userId };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
        }

        // 1. Remove cards that are no longer selected
        var cardsToRemove = await _context.Cards
            .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleTasks" && !externalIds.Contains(c.IntegrationExternalId!))
            .ToListAsync();
        
        if (cardsToRemove.Any())
        {
            _logger.LogInformation("Removing {CardCount} Google Tasks cards that are no longer imported.", cardsToRemove.Count);
            _context.Cards.RemoveRange(cardsToRemove);
        }

        // 2. Add or update selected cards
        var allTaskLists = await _googleTasksService.GetTaskListsAsync(user);

        foreach (var externalId in externalIds)
        {
            var existingCard = await _context.Cards
                .Include(c => c.ListItems)
                .FirstOrDefaultAsync(c => c.UserId == userId && c.IntegrationSource == "GoogleTasks" && c.IntegrationExternalId == externalId);

            var listDetails = allTaskLists.FirstOrDefault(l => l.Id == externalId);
            var listTitle = listDetails?.Title ?? "Google Tasks List";

            var googleTasks = await _googleTasksService.GetTasksAsync(user, externalId);
            var activeAndRecentTasks = googleTasks
                .Where(t => !string.IsNullOrEmpty(t.Title) && t.Deleted != true && t.Hidden != true)
                .ToList();

            if (existingCard == null)
            {
                _logger.LogInformation("Creating new Card for imported Google Tasks list: '{Title}' (External ID: {ExtId})", listTitle, externalId);
                var newCard = new Card
                {
                    Title = listTitle,
                    Description = "Synced from Google Tasks",
                    CategoryId = category.Id,
                    UserId = userId,
                    IsChecklist = true,
                    IntegrationSource = "GoogleTasks",
                    IntegrationExternalId = externalId,
                    ListItems = activeAndRecentTasks.Select(task => new ListItem
                    {
                        Text = task.Title,
                        IsCompleted = task.Status == "completed",
                        IntegrationExternalId = task.Id
                    }).ToList()
                };
                _context.Cards.Add(newCard);
            }
            else
            {
                _logger.LogDebug("Updating existing Card for Google Tasks list: '{Title}' (External ID: {ExtId})", listTitle, externalId);
                existingCard.Title = listTitle;

                // Remove items that no longer exist in Google Tasks
                var googleTaskIds = activeAndRecentTasks.Select(t => t.Id).ToHashSet();
                var itemsToRemove = existingCard.ListItems
                    .Where(li => !googleTaskIds.Contains(li.IntegrationExternalId!))
                    .ToList();
                
                foreach (var item in itemsToRemove)
                {
                    existingCard.ListItems.Remove(item);
                }

                // Add or update items
                foreach (var task in activeAndRecentTasks)
                {
                    var existingItem = existingCard.ListItems.FirstOrDefault(li => li.IntegrationExternalId == task.Id);
                    var isTaskCompleted = task.Status == "completed";

                    if (existingItem == null)
                    {
                        existingCard.ListItems.Add(new ListItem
                        {
                            Text = task.Title,
                            IsCompleted = isTaskCompleted,
                            IntegrationExternalId = task.Id
                        });
                    }
                    else
                    {
                        existingItem.Text = task.Title;
                        existingItem.IsCompleted = isTaskCompleted;
                    }
                }
            }
        }

        await _context.SaveChangesAsync();

        var keepCards = await _context.Cards
            .Include(c => c.Category)
            .Include(c => c.ListItems)
                .ThenInclude(li => li.ScheduledInstances)
            .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleTasks")
            .ToListAsync();

        return keepCards.Select(ToDto).ToList();
    }

    public async Task<CardDto> SyncMicrosoftTodoAsync(int userId)
    {
        _logger.LogInformation("Starting Microsoft To-Do synchronization for User {UserId}.", userId);
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.MicrosoftTodoConnected)
        {
            _logger.LogError("SyncMicrosoftTodoAsync failed: User {UserId} not found or Microsoft To-Do disconnected.", userId);
            throw new InvalidOperationException("Microsoft TODO is not connected.");
        }

        var accessToken = await _microsoftTodoService.GetOrRefreshTokenAsync(user);

        var lists = await _microsoftTodoService.GetTodoListsAsync(accessToken);
        var defaultList = lists.FirstOrDefault(l => l.DisplayName.Equals("Tasks", StringComparison.OrdinalIgnoreCase)) ?? lists.FirstOrDefault();

        if (defaultList == null)
        {
            _logger.LogError("SyncMicrosoftTodoAsync failed: No Microsoft To-Do task lists found for User {UserId}.", userId);
            throw new InvalidOperationException("No Microsoft To-Do list found.");
        }

        var apiTasks = await _microsoftTodoService.GetTasksAsync(accessToken, defaultList.Id);
        var activeTasks = apiTasks.Where(t => t.Status != "completed").ToList();

        _logger.LogDebug("Fetched {Count} active tasks from Microsoft To-Do default list '{ListName}' ({ListId}).", activeTasks.Count, defaultList.DisplayName, defaultList.Id);

        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == "Microsoft TODO");
        if (category == null)
        {
            _logger.LogInformation("Microsoft TODO category not found. Creating a default category for User {UserId}.", userId);
            category = new Category { Name = "Microsoft TODO", Color = "#2563eb", UserId = userId };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
        }

        var card = await _context.Cards
            .Include(c => c.ListItems)
                .ThenInclude(li => li.ScheduledInstances)
            .FirstOrDefaultAsync(c => c.UserId == userId && c.IntegrationSource == "MicrosoftTodo" && 
                (c.IntegrationExternalId == defaultList.Id || c.IntegrationExternalId == "ms-todo-default"));

        if (card == null)
        {
            _logger.LogInformation("Creating Microsoft To-Do tasks Card for User {UserId}.", userId);
            card = new Card
            {
                Title = "Microsoft TODO Tasks",
                Description = "Tasks synced from Microsoft TODO",
                CategoryId = category.Id,
                UserId = userId,
                IsChecklist = true,
                IntegrationSource = "MicrosoftTodo",
                IntegrationExternalId = defaultList.Id,
                ListItems = activeTasks.Select(task => new ListItem
                {
                    Text = task.Title,
                    IsCompleted = false,
                    IntegrationExternalId = task.Id
                }).ToList()
            };
            _context.Cards.Add(card);
        }
        else
        {
            if (card.IntegrationExternalId == "ms-todo-default")
            {
                _logger.LogInformation("Upgrading mock Microsoft To-Do Card to actual list ID '{ListId}' for User {UserId}.", defaultList.Id, userId);
                card.IntegrationExternalId = defaultList.Id;
            }

            var activeTaskIds = activeTasks.Select(t => t.Id).ToHashSet();

            // 1. Remove items that no longer exist in MS To-Do's active list
            var itemsToRemove = card.ListItems
                .Where(li => !string.IsNullOrEmpty(li.IntegrationExternalId) && !activeTaskIds.Contains(li.IntegrationExternalId))
                .ToList();
            
            if (itemsToRemove.Any())
            {
                _logger.LogInformation("Removing {Count} checklist items no longer present in Microsoft To-Do list.", itemsToRemove.Count);
                foreach (var item in itemsToRemove)
                {
                    card.ListItems.Remove(item);
                }
            }

            // 2. Add new active items
            int addedCount = 0;
            foreach (var task in activeTasks)
            {
                if (!card.ListItems.Any(li => li.IntegrationExternalId == task.Id))
                {
                    card.ListItems.Add(new ListItem
                    {
                        Text = task.Title,
                        IsCompleted = false,
                        IntegrationExternalId = task.Id
                    });
                    addedCount++;
                }
            }
            if (addedCount > 0)
            {
                _logger.LogInformation("Added {Count} new tasks from Microsoft To-Do to Card.", addedCount);
            }
        }

        await _context.SaveChangesAsync();

        var reloadedCard = await _context.Cards
            .Include(c => c.Category)
            .Include(c => c.ListItems)
                .ThenInclude(li => li.ScheduledInstances)
            .FirstAsync(c => c.Id == card.Id);

        _logger.LogInformation("Successfully synchronized Microsoft To-Do tasks for User {UserId}.", userId);
        return ToDto(reloadedCard);
    }

    private static CardDto ToDto(Card c) => new()
    {
        Id = c.Id,
        Order = c.Order,
        Title = c.Title,
        Description = c.Description,
        ScheduledDate = c.ScheduledDate,
        IsChecklist = c.IsChecklist,
        ListItems = c.ListItems.Select(ToItemDto).ToList(),
        CategoryId = c.CategoryId,
        UserId = c.UserId,
        IntegrationSource = c.IntegrationSource,
        IntegrationExternalId = c.IntegrationExternalId,
        WhiteboardX = c.WhiteboardX,
        WhiteboardY = c.WhiteboardY,
        Category = c.Category != null ? new CategoryDto
        {
            Id = c.Category.Id,
            Name = c.Category.Name,
            Color = c.Category.Color
        } : null
    };

    private static ListItemDto ToItemDto(ListItem i) => new()
    {
        Id = i.Id,
        Text = i.Text,
        IsCompleted = i.IsCompleted,
        CardId = i.CardId,
        IntegrationExternalId = i.IntegrationExternalId,
        ScheduledInstances = i.ScheduledInstances?.Select(inst => new ScheduledInstanceDto
        {
            Id = inst.Id,
            Date = inst.Date,
            IsCompleted = inst.IsCompleted,
            UserId = inst.UserId,
            ListItemId = inst.ListItemId,
            CategoryId = inst.CategoryId,
            Title = inst.Title,
            Description = inst.Description,
            Type = inst.Type,
            StartTime = inst.StartTime,
            EndTime = inst.EndTime
        }).ToList() ?? new()
    };
}
