using Microsoft.EntityFrameworkCore;
using LifePlanner.Api.Data;
using LifePlanner.Api.Models;

namespace LifePlanner.Api.Services;

public class IntegrationService : IIntegrationService
{
    private readonly LifePlannerDbContext _context;
    private readonly IGoogleTasksService _googleTasksService;
    private readonly IMicrosoftTodoService _microsoftTodoService;

    public IntegrationService(LifePlannerDbContext context, IGoogleTasksService googleTasksService, IMicrosoftTodoService microsoftTodoService)
    {
        _context = context;
        _googleTasksService = googleTasksService;
        _microsoftTodoService = microsoftTodoService;
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
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return new IntegrationStatusDto(false, false);

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleTasksConnected);
    }

    public async Task<IntegrationStatusDto> ConnectAsync(int userId, string provider)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new KeyNotFoundException("User not found");

        if (provider.Equals("MicrosoftTodo", StringComparison.OrdinalIgnoreCase))
        {
            user.MicrosoftTodoConnected = true;
            await _context.SaveChangesAsync();
            // Automatically sync on connection
            await SyncMicrosoftTodoAsync(userId);
        }
        else if (provider.Equals("GoogleTasks", StringComparison.OrdinalIgnoreCase))
        {
            user.GoogleTasksConnected = true;
            await _context.SaveChangesAsync();
        }

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleTasksConnected);
    }

    public async Task<IntegrationStatusDto> DisconnectAsync(int userId, string provider)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new KeyNotFoundException("User not found");

        if (provider.Equals("MicrosoftTodo", StringComparison.OrdinalIgnoreCase))
        {
            user.MicrosoftTodoConnected = false;
            user.MicrosoftAccessToken = null;
            user.MicrosoftRefreshToken = null;
            user.MicrosoftTokenExpiration = null;
            
            // Delete imported MS Todo cards
            var todoCards = await _context.Cards
                .Where(c => c.UserId == userId && c.IntegrationSource == "MicrosoftTodo")
                .ToListAsync();
            _context.Cards.RemoveRange(todoCards);
            
            await _context.SaveChangesAsync();
        }
        else if (provider.Equals("GoogleTasks", StringComparison.OrdinalIgnoreCase))
        {
            user.GoogleTasksConnected = false;

            // Delete imported Google Tasks cards
            var keepCards = await _context.Cards
                .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleTasks")
                .ToListAsync();
            _context.Cards.RemoveRange(keepCards);

            await _context.SaveChangesAsync();
        }

        return new IntegrationStatusDto(user.MicrosoftTodoConnected, user.GoogleTasksConnected);
    }

    public async Task<List<GoogleTaskListDto>> GetGoogleTaskListsAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.GoogleTasksConnected)
            throw new InvalidOperationException("Google Tasks is not connected.");

        // Check which ones are already imported
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
        return results.ToList();
    }

    public async Task<List<CardDto>> ImportGoogleTaskListsAsync(int userId, List<string> externalIds)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.GoogleTasksConnected)
            throw new InvalidOperationException("Google Tasks is not connected.");

        // Get category or create one
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == "Google Tasks");
        if (category == null)
        {
            category = new Category { Name = "Google Tasks", Color = "#2563eb", UserId = userId };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
        }

        // 1. Remove cards that are no longer selected
        var cardsToRemove = await _context.Cards
            .Where(c => c.UserId == userId && c.IntegrationSource == "GoogleTasks" && !externalIds.Contains(c.IntegrationExternalId!))
            .ToListAsync();
        _context.Cards.RemoveRange(cardsToRemove);

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
                // Create new card
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
                // Update title if changed
                existingCard.Title = listTitle;

                // 1. Remove items that no longer exist in Google Tasks
                var googleTaskIds = activeAndRecentTasks.Select(t => t.Id).ToHashSet();
                var itemsToRemove = existingCard.ListItems
                    .Where(li => !googleTaskIds.Contains(li.IntegrationExternalId!))
                    .ToList();
                foreach (var item in itemsToRemove)
                {
                    existingCard.ListItems.Remove(item);
                }

                // 2. Add or update items
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

        // Return all updated Google Tasks cards
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
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.MicrosoftTodoConnected)
            throw new InvalidOperationException("Microsoft TODO is not connected.");

        // Retrieve active access token (refreshes if expired)
        var accessToken = await _microsoftTodoService.GetOrRefreshTokenAsync(user);

        // Fetch lists and get the default Tasks list (commonly named "Tasks")
        var lists = await _microsoftTodoService.GetTodoListsAsync(accessToken);
        var defaultList = lists.FirstOrDefault(l => l.DisplayName.Equals("Tasks", StringComparison.OrdinalIgnoreCase)) ?? lists.FirstOrDefault();

        if (defaultList == null)
            throw new InvalidOperationException("No Microsoft To-Do list found.");

        var apiTasks = await _microsoftTodoService.GetTasksAsync(accessToken, defaultList.Id);
        var activeTasks = apiTasks.Where(t => t.Status != "completed").ToList();

        // Get category or create one
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == "Microsoft TODO");
        if (category == null)
        {
            category = new Category { Name = "Microsoft TODO", Color = "#2563eb", UserId = userId };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
        }

        // Get or create the card (upgrade from 'ms-todo-default' if it exists)
        var card = await _context.Cards
            .Include(c => c.ListItems)
                .ThenInclude(li => li.ScheduledInstances)
            .FirstOrDefaultAsync(c => c.UserId == userId && c.IntegrationSource == "MicrosoftTodo" && 
                (c.IntegrationExternalId == defaultList.Id || c.IntegrationExternalId == "ms-todo-default"));

        if (card == null)
        {
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
            // Upgrade external ID if still using the mock ID
            if (card.IntegrationExternalId == "ms-todo-default")
            {
                card.IntegrationExternalId = defaultList.Id;
            }

            var activeTaskIds = activeTasks.Select(t => t.Id).ToHashSet();

            // 1. Remove items that no longer exist in MS To-Do's active list
            var itemsToRemove = card.ListItems
                .Where(li => !string.IsNullOrEmpty(li.IntegrationExternalId) && !activeTaskIds.Contains(li.IntegrationExternalId))
                .ToList();
            foreach (var item in itemsToRemove)
            {
                card.ListItems.Remove(item);
            }

            // 2. Add new active items
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
                }
            }
        }

        await _context.SaveChangesAsync();

        // Reload to get fully mapped data
        var reloadedCard = await _context.Cards
            .Include(c => c.Category)
            .Include(c => c.ListItems)
                .ThenInclude(li => li.ScheduledInstances)
            .FirstAsync(c => c.Id == card.Id);

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
