using System.Diagnostics;
using System.IO.Pipes;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(8080);
});

var app = builder.Build();

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

void RunCmdCommand(string command, string arguments)
{
    var processInfo = new ProcessStartInfo
    {
        FileName = command,
        Arguments = arguments,
        CreateNoWindow = true,
        UseShellExecute = false
    };
    Process.Start(processInfo);
}

string CredentialsFile = "credentials.dat";

app.MapPost("/api/lock", () =>
{
    RunCmdCommand("rundll32.exe", "user32.dll,LockWorkStation");
    return Results.Ok(new { message = "PC Locked" });
});

app.MapPost("/api/shutdown", () =>
{
    RunCmdCommand("shutdown", "/s /t 0");
    return Results.Ok(new { message = "PC Shutting down" });
});

app.MapPost("/api/sleep", () =>
{
    RunCmdCommand("rundll32.exe", "powrprof.dll,SetSuspendState 0,1,0");
    return Results.Ok(new { message = "PC Sleeping" });
});

app.MapGet("/api/status", () =>
{
    return Results.Ok(new { status = "online", os = "Windows" });
});

app.MapPost("/api/set-credentials", (CredentialPayload payload) =>
{
    if (string.IsNullOrEmpty(payload.Password)) return Results.BadRequest("Password is required.");
    byte[] plainBytes = Encoding.UTF8.GetBytes(payload.Password);
    byte[] encryptedBytes = ProtectedData.Protect(plainBytes, null, DataProtectionScope.LocalMachine);
    File.WriteAllBytes(CredentialsFile, encryptedBytes);
    return Results.Ok(new { message = "Credentials securely saved using DPAPI." });
});

app.MapPost("/api/unlock", async () =>
{
    if (!File.Exists(CredentialsFile)) {
        return Results.BadRequest(new { error = "No credentials configured. Call /api/set-credentials first." });
    }

    try 
    {
        byte[] encryptedBytes = File.ReadAllBytes(CredentialsFile);
        byte[] plainBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.LocalMachine);
        string password = Encoding.UTF8.GetString(plainBytes);

        // Send to Credential Provider via Named Pipe
        using (var pipeClient = new NamedPipeClientStream(".", "RemoteWOLCredentialPipe", PipeDirection.Out))
        {
            await pipeClient.ConnectAsync(3000); // 3 second timeout
            using (var writer = new StreamWriter(pipeClient))
            {
                await writer.WriteLineAsync(password);
                await writer.FlushAsync();
            }
        }
        return Results.Ok(new { message = "Unlock signal sent to Credential Provider." });
    }
    catch (TimeoutException)
    {
        return Results.StatusCode(503); // Service Unavailable - Credential Provider not listening (maybe not locked?)
    }
    catch (Exception)
    {
        return Results.StatusCode(500); // Internal Server Error
    }
});

app.Run();

public class CredentialPayload {
    public string? Password { get; set; }
}
