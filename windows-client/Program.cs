using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(8085);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");

app.Use(async (context, next) =>
{
    var config = app.Services.GetRequiredService<IConfiguration>();
    var expectedApiKey = config["ApiKey"] ?? "default_secret_key_change_me";
    
    var providedApiKey = context.Request.Headers["x-api-key"].FirstOrDefault();

    if (string.IsNullOrEmpty(providedApiKey) || providedApiKey != expectedApiKey)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsync("Unauthorized: Invalid or missing API Key.");
        return;
    }

    await next();
});

static string RunCmdCommand(string command, string arguments)
{
    try
    {
        var processInfo = new ProcessStartInfo
        {
            FileName = command,
            Arguments = arguments,
            CreateNoWindow = true,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        using (var process = Process.Start(processInfo))
        {
            if (process == null) return "Failed to start process.";
            string output = process.StandardOutput.ReadToEnd();
            string error = process.StandardError.ReadToEnd();
            process.WaitForExit();
            if (process.ExitCode != 0)
            {
                return $"Code {process.ExitCode}: {error.Trim()} {output.Trim()}";
            }
        }
        return null;
    }
    catch (Exception ex)
    {
        return $"Exception: {ex.Message}";
    }
}

app.MapPost("/api/lock", () =>
{
    // The service runs as SYSTEM, so LockWorkStation won't affect the user's session.
    // We trigger the scheduled task 'RemoteWOL_Lock' which runs interactively.
    var err = RunCmdCommand("schtasks.exe", "/run /tn \"RemoteWOL_Lock\"");
    if (err != null) return Results.BadRequest(new { error = $"Lock failed: {err}" });
    return Results.Ok(new { message = "PC Locked" });
});

app.MapPost("/api/shutdown", () =>
{
    var err = RunCmdCommand("shutdown", "/s /t 0");
    if (err != null) return Results.BadRequest(new { error = $"Shutdown failed: {err}" });
    return Results.Ok(new { message = "PC Shutting down" });
});

app.MapPost("/api/sleep", () =>
{
    var err = RunCmdCommand("rundll32.exe", "powrprof.dll,SetSuspendState 0,1,0");
    if (err != null) return Results.BadRequest(new { error = $"Sleep failed: {err}" });
    return Results.Ok(new { message = "PC Sleeping" });
});

app.MapGet("/api/status", () =>
{
    return Results.Ok(new { status = "online", os = "Windows" });
});

app.Run();
