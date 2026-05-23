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
}
