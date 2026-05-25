using Microsoft.Extensions.Logging;
using System;
using System.IO;

namespace LifePlanner.Api.Services;

public class FileLogger : ILogger
{
    private readonly string _categoryName;
    private readonly string _logsDir;
    private static readonly object _lock = new();

    public FileLogger(string categoryName)
    {
        _categoryName = categoryName;
        _logsDir = Path.Combine(Directory.GetCurrentDirectory(), "logs");
        
        try
        {
            if (!Directory.Exists(_logsDir))
            {
                Directory.CreateDirectory(_logsDir);
            }
        }
        catch
        {
            // Fallback gracefully in environments where creating directory fails initially
        }
    }

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel)) return;

        var message = formatter(state, exception);
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
        var logRecord = $"[{timestamp}] [{logLevel.ToString().ToUpperInvariant()}] [{_categoryName}] {message}";

        if (exception != null)
        {
            logRecord += $"{Environment.NewLine}{exception}";
        }

        try
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var filePath = Path.Combine(_logsDir, $"lifeplanner-{today}.log");

            lock (_lock)
            {
                File.AppendAllText(filePath, logRecord + Environment.NewLine);
            }
        }
        catch
        {
            // Swallowing exceptions from file logging to avoid crashing application
        }
    }
}

[ProviderAlias("File")]
public class FileLoggerProvider : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName)
    {
        return new FileLogger(categoryName);
    }

    public void Dispose() { }
}

public static class FileLoggerExtensions
{
    public static ILoggingBuilder AddFileLogger(this ILoggingBuilder builder)
    {
        builder.AddProvider(new FileLoggerProvider());
        return builder;
    }
}
