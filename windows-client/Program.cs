using System.Runtime.InteropServices;
using System.Diagnostics;

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

static string RunCmdCommandAsync(string command, string arguments)
{
    try
    {
        var processInfo = new ProcessStartInfo
        {
            FileName = command,
            Arguments = arguments,
            CreateNoWindow = true,
            UseShellExecute = false
        };
        Process.Start(processInfo);
        return null;
    }
    catch (Exception ex)
    {
        return $"Exception: {ex.Message}";
    }
}

app.MapPost("/api/lock", () =>
{
    var err = RunCmdCommandAsync("rundll32.exe", "user32.dll,LockWorkStation");
    if (err != null) return Results.BadRequest(new { error = $"Lock failed: {err}" });
    return Results.Ok(new { message = "PC Locked" });
});

app.MapPost("/api/shutdown", () =>
{
    var err = RunCmdCommandAsync("shutdown", "/s /t 0");
    if (err != null) return Results.BadRequest(new { error = $"Shutdown failed: {err}" });
    return Results.Ok(new { message = "PC Shutting down" });
});

app.MapPost("/api/sleep", () =>
{
    var err = RunCmdCommandAsync("rundll32.exe", "powrprof.dll,SetSuspendState 0,1,0");
    if (err != null) return Results.BadRequest(new { error = $"Sleep failed: {err}" });
    return Results.Ok(new { message = "PC Sleeping" });
});

app.MapGet("/api/status", () =>
{
    return Results.Ok(new { status = "online", os = "Windows" });
});

// --- Media & Volume Controls ---
[DllImport("user32.dll", SetLastError = true)]
static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
const int KEYEVENTF_EXTENDEDKEY = 0x0001;
const int KEYEVENTF_KEYUP = 0x0002;

static void PressKey(byte keyCode)
{
    keybd_event(keyCode, 0, KEYEVENTF_EXTENDEDKEY, 0);
    keybd_event(keyCode, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0);
}

app.MapPost("/api/media/{action}", (string action) =>
{
    byte keyCode = action switch
    {
        "play_pause" => 0xB3, // VK_MEDIA_PLAY_PAUSE
        "next" => 0xB0,       // VK_MEDIA_NEXT_TRACK
        "prev" => 0xB1,       // VK_MEDIA_PREV_TRACK
        "vol_up" => 0xAF,     // VK_VOLUME_UP
        "vol_down" => 0xAE,   // VK_VOLUME_DOWN
        "vol_mute" => 0xAD,   // VK_VOLUME_MUTE
        _ => 0
    };

    if (keyCode == 0) return Results.BadRequest(new { error = "Action inconnue" });

    PressKey(keyCode);
    return Results.Ok(new { message = $"Media action: {action}" });
});

// --- Screen Off ---
[DllImport("user32.dll", SetLastError = true)]
static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);
const int HWND_BROADCAST = 0xFFFF;
const uint WM_SYSCOMMAND = 0x0112;
const int SC_MONITORPOWER = 0xF170;
const uint SMTO_ABORTIFHUNG = 0x0002;

app.MapPost("/api/screen/off", () =>
{
    Task.Run(() => {
        IntPtr result;
        SendMessageTimeout((IntPtr)HWND_BROADCAST, WM_SYSCOMMAND, (IntPtr)SC_MONITORPOWER, (IntPtr)2, SMTO_ABORTIFHUNG, 1000, out result);
    });
    return Results.Ok(new { message = "Screens turned off" });
});

// --- App Launcher ---
app.MapPost("/api/launch", (LaunchRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.Path)) return Results.BadRequest(new { error = "Chemin manquant" });
    
    try
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = req.Path,
            UseShellExecute = true
        });
        return Results.Ok(new { message = $"Launched: {req.Path}" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Erreur de lancement: {ex.Message}" });
    }
});

// --- Discord Hotkey ---
app.MapPost("/api/discord/mute", () =>
{
    // Simulate Ctrl + Shift + M
    const byte VK_CONTROL = 0x11;
    const byte VK_SHIFT = 0x10;
    const byte VK_M = 0x4D;

    keybd_event(VK_CONTROL, 0, KEYEVENTF_EXTENDEDKEY, 0);
    keybd_event(VK_SHIFT, 0, KEYEVENTF_EXTENDEDKEY, 0);
    keybd_event(VK_M, 0, KEYEVENTF_EXTENDEDKEY, 0);

    keybd_event(VK_M, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0);
    keybd_event(VK_SHIFT, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0);
    keybd_event(VK_CONTROL, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0);

    return Results.Ok(new { message = "Discord Mute Toggled (Ctrl+Shift+M)" });
});

// --- Audio Switcher ---
app.MapGet("/api/audio/devices", () =>
{
    try {
        var controller = new AudioSwitcher.AudioApi.CoreAudio.CoreAudioController();
        var devices = controller.GetPlaybackDevices(AudioSwitcher.AudioApi.DeviceState.Active)
            .Select(d => new { id = d.Id, name = d.FullName, isDefault = d.IsDefaultDevice })
            .ToList();
        return Results.Ok(devices);
    } catch (Exception ex) {
        return Results.BadRequest(new { error = ex.Message });
    }
});


app.MapPost("/api/audio/set-device", (SetAudioDeviceRequest req) =>
{
    try {
        var controller = new AudioSwitcher.AudioApi.CoreAudio.CoreAudioController();
        var device = controller.GetDevice(req.Id);
        if (device == null) return Results.BadRequest(new { error = "Périphérique introuvable" });
        
        device.SetAsDefault();
        device.SetAsDefaultCommunications();
        return Results.Ok(new { message = $"Sortie changée vers {device.FullName}" });
    } catch (Exception ex) {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/audio/toggle-mic", () =>
{
    try {
        var controller = new AudioSwitcher.AudioApi.CoreAudio.CoreAudioController();
        var mic = controller.DefaultCaptureDevice;
        if (mic == null) return Results.BadRequest(new { error = "Aucun micro par défaut" });
        
        bool isMuted = mic.IsMuted;
        mic.Mute(!isMuted);
        return Results.Ok(new { message = !isMuted ? "Microphone désactivé" : "Microphone activé", isMuted = !isMuted });
    } catch (Exception ex) {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.Run();

public record LaunchRequest(string Path);
public record SetAudioDeviceRequest(Guid Id);
