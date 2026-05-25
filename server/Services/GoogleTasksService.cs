using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Tasks.v1;
using Google.Apis.Tasks.v1.Data;
using LifePlanner.Api.Models;
using GoogleTask = Google.Apis.Tasks.v1.Data.Task;

namespace LifePlanner.Api.Services;

public class GoogleTasksService : IGoogleTasksService
{
    private TasksService GetService(User user)
    {
        if (string.IsNullOrEmpty(user.GoogleAccessToken))
            throw new UnauthorizedAccessException("User has not connected their Google account.");

        var credential = GoogleCredential.FromAccessToken(user.GoogleAccessToken);

        return new TasksService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "LifePlanner"
        });
    }

    public async System.Threading.Tasks.Task<IList<TaskList>> GetTaskListsAsync(User user)
    {
        var service = GetService(user);
        var request = service.Tasklists.List();
        var result = await request.ExecuteAsync();
        return result.Items ?? new List<TaskList>();
    }

    public async System.Threading.Tasks.Task<IList<GoogleTask>> GetTasksAsync(User user, string taskListId)
    {
        var service = GetService(user);
        var request = service.Tasks.List(taskListId);
        request.ShowCompleted = true;
        request.ShowHidden = true;
        var result = await request.ExecuteAsync();
        return result.Items ?? new List<GoogleTask>();
    }

    public async System.Threading.Tasks.Task<string> CreateTaskAsync(User user, string taskListId, string title)
    {
        var service = GetService(user);
        var newTask = new GoogleTask
        {
            Title = title
        };
        var request = service.Tasks.Insert(newTask, taskListId);
        var result = await request.ExecuteAsync();
        return result.Id;
    }

    public async System.Threading.Tasks.Task UpdateTaskAsync(User user, string taskListId, string taskId, string? title = null, bool? isCompleted = null)
    {
        var service = GetService(user);
        var taskToUpdate = new GoogleTask();

        if (title != null)
        {
            taskToUpdate.Title = title;
        }

        if (isCompleted.HasValue)
        {
            taskToUpdate.Status = isCompleted.Value ? "completed" : "needsAction";
            if (!isCompleted.Value)
            {
                taskToUpdate.Completed = null;
            }
        }

        var request = service.Tasks.Patch(taskToUpdate, taskListId, taskId);
        await request.ExecuteAsync();
    }

    public async System.Threading.Tasks.Task DeleteTaskAsync(User user, string taskListId, string taskId)
    {
        var service = GetService(user);
        var request = service.Tasks.Delete(taskListId, taskId);
        await request.ExecuteAsync();
    }
}
