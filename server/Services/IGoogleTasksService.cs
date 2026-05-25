using Google.Apis.Tasks.v1.Data;
using LifePlanner.Api.Models;
using GoogleTask = Google.Apis.Tasks.v1.Data.Task;

namespace LifePlanner.Api.Services;

public interface IGoogleTasksService
{
    System.Threading.Tasks.Task<IList<TaskList>> GetTaskListsAsync(User user);
    System.Threading.Tasks.Task<IList<GoogleTask>> GetTasksAsync(User user, string taskListId);
    System.Threading.Tasks.Task<GoogleTask> CreateTaskAsync(User user, string taskListId, string title);
    System.Threading.Tasks.Task<GoogleTask> MoveTaskAsync(User user, string taskListId, string taskId, string? previousTaskId);
    System.Threading.Tasks.Task UpdateTaskAsync(User user, string taskListId, string taskId, string? title = null, bool? isCompleted = null);
    System.Threading.Tasks.Task DeleteTaskAsync(User user, string taskListId, string taskId);
}
