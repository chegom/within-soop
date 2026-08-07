use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use sysinfo::System;
use tauri::{LogicalSize, PhysicalPosition, WebviewWindow};

// IDE 확장(VS Code·Antigravity)이나 ChatGPT 앱의 세션은 프로세스 이름만으로
// 구분할 수 없어 세션 기록 파일의 mtime으로 보충 감지한다. 파일 내용은 읽지 않는다.
const SESSION_FILE_ACTIVITY_WINDOW: Duration = Duration::from_secs(300);
const SESSION_FILE_SCAN_LIMIT: usize = 20_000;

const COMPACT_WIDTH: f64 = 270.0;
const COMPACT_HEIGHT: f64 = 136.0;
const COMPACT_MARGIN: f64 = 18.0;
const FULL_WIDTH: f64 = 920.0;
const FULL_HEIGHT: f64 = 700.0;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiSessionSnapshot {
    active: bool,
    tools: Vec<&'static str>,
    started_at: Option<u64>,
}

fn identify_ai_tool(
    process_name: &str,
    executable_path: &str,
    command_line: &str,
) -> Option<&'static str> {
    let name = process_name.to_ascii_lowercase();
    let executable = executable_path.to_ascii_lowercase();
    let command = command_line.to_ascii_lowercase();

    let is_codex = name == "codex"
        || name == "codex.exe"
        || name.starts_with("codex-")
        || executable.ends_with("/codex")
        || executable.ends_with("\\codex.exe");

    let is_codex_background_service = name == "codex-code-mode-host"
        || command.split_whitespace().any(|argument| {
            matches!(argument, "app-server" | "sandbox")
                || argument.starts_with("features.code_mode_host")
        });

    if is_codex && !is_codex_background_service {
        return Some("Codex");
    }

    let is_claude_process = name == "claude"
        || name == "claude.exe"
        || name.starts_with("claude-")
        || executable.ends_with("/claude")
        || executable.ends_with("\\claude.exe");

    let is_claude_desktop_shell = executable
        .ends_with("/applications/claude.app/contents/macos/claude")
        || executable.contains("\\appdata\\local\\anthropicclaude\\claude.exe")
        || executable.contains("\\program files\\claude\\claude.exe");

    let has_session_arguments = command.contains("--output-format")
        || command.contains("--input-format")
        || command.contains("--resume")
        || command.contains("--continue");

    if is_claude_process && (!is_claude_desktop_shell || has_session_arguments) {
        return Some("Claude Code");
    }

    None
}

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

fn claude_projects_root() -> Option<PathBuf> {
    if let Some(root) = std::env::var_os("CLAUDE_CONFIG_DIR") {
        return Some(PathBuf::from(root).join("projects"));
    }
    home_dir().map(|home| home.join(".claude").join("projects"))
}

fn codex_sessions_root() -> Option<PathBuf> {
    if let Some(root) = std::env::var_os("CODEX_HOME") {
        return Some(PathBuf::from(root).join("sessions"));
    }
    home_dir().map(|home| home.join(".codex").join("sessions"))
}

fn has_recent_session_write(root: &Path, now: SystemTime, window: Duration) -> bool {
    let mut pending = vec![root.to_path_buf()];
    let mut visited = 0usize;

    while let Some(directory) = pending.pop() {
        let Ok(entries) = std::fs::read_dir(&directory) else {
            continue;
        };
        for entry in entries.flatten() {
            let Ok(file_type) = entry.file_type() else {
                continue;
            };
            if file_type.is_symlink() {
                continue;
            }
            if file_type.is_dir() {
                pending.push(entry.path());
                continue;
            }
            if !file_type.is_file() {
                continue;
            }
            let name = entry.file_name();
            let Some(name) = name.to_str() else {
                continue;
            };
            if !name.ends_with(".jsonl") {
                continue;
            }
            visited += 1;
            if let Ok(modified) = entry.metadata().and_then(|metadata| metadata.modified()) {
                match now.duration_since(modified) {
                    Ok(age) if age <= window => return true,
                    // mtime이 기준 시각보다 미래면 방금 쓰인 파일로 본다.
                    Err(_) => return true,
                    Ok(_) => {}
                }
            }
            if visited >= SESSION_FILE_SCAN_LIMIT {
                return false;
            }
        }
    }
    false
}

fn session_start_tracker() -> &'static Mutex<HashMap<&'static str, u64>> {
    static TRACKER: OnceLock<Mutex<HashMap<&'static str, u64>>> = OnceLock::new();
    TRACKER.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
fn detect_ai_session() -> AiSessionSnapshot {
    let system = System::new_all();
    let mut active_tools: HashMap<&'static str, Option<u64>> = HashMap::new();

    for process in system.processes().values() {
        let process_name = process.name().to_string_lossy();
        let executable_path = process
            .exe()
            .map(|path| path.to_string_lossy().into_owned())
            .unwrap_or_default();
        let command_line = process
            .cmd()
            .iter()
            .map(|part| part.to_string_lossy())
            .collect::<Vec<_>>()
            .join(" ");

        if let Some(tool) = identify_ai_tool(&process_name, &executable_path, &command_line) {
            let process_started_at = process.start_time();
            active_tools
                .entry(tool)
                .and_modify(|current| {
                    *current = Some(
                        current.map_or(process_started_at, |value| value.max(process_started_at)),
                    );
                })
                .or_insert(Some(process_started_at));
        }
    }

    let now = SystemTime::now();
    if !active_tools.contains_key("Codex") {
        if let Some(root) = codex_sessions_root() {
            if has_recent_session_write(&root, now, SESSION_FILE_ACTIVITY_WINDOW) {
                active_tools.insert("Codex", None);
            }
        }
    }
    if !active_tools.contains_key("Claude Code") {
        if let Some(root) = claude_projects_root() {
            if has_recent_session_write(&root, now, SESSION_FILE_ACTIVITY_WINDOW) {
                active_tools.insert("Claude Code", None);
            }
        }
    }

    let now_secs = now.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let mut tracker = session_start_tracker()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    tracker.retain(|tool, _| active_tools.contains_key(tool));

    let mut started_at: Option<u64> = None;
    let mut tools = Vec::with_capacity(2);
    for tool in ["Codex", "Claude Code"] {
        let Some(process_started_at) = active_tools.get(tool) else {
            continue;
        };
        let tool_started_at =
            process_started_at.unwrap_or_else(|| *tracker.entry(tool).or_insert(now_secs));
        started_at = Some(
            started_at
                .map(|current| current.max(tool_started_at))
                .unwrap_or(tool_started_at),
        );
        tools.push(tool);
    }

    AiSessionSnapshot {
        active: !tools.is_empty(),
        tools,
        started_at,
    }
}

fn compact_position(
    work_position: (i32, i32),
    work_size: (u32, u32),
    scale_factor: f64,
) -> (i32, i32) {
    let window_width = (COMPACT_WIDTH * scale_factor).round() as i32;
    let window_height = (COMPACT_HEIGHT * scale_factor).round() as i32;
    let margin = (COMPACT_MARGIN * scale_factor).round() as i32;

    let x = work_position.0 + work_size.0 as i32 - window_width - margin;
    let y = work_position.1 + work_size.1 as i32 - window_height - margin;

    (x.max(work_position.0), y.max(work_position.1))
}

#[cfg(target_os = "macos")]
fn set_macos_fullscreen_companion(window: &WebviewWindow, visible: bool) -> Result<(), String> {
    use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};

    window
        .set_visible_on_all_workspaces(visible)
        .map_err(|error| error.to_string())?;

    window
        .with_webview(move |webview| unsafe {
            let native_window: &NSWindow = &*webview.ns_window().cast();
            let mut behavior = native_window.collectionBehavior();

            if visible {
                behavior |= NSWindowCollectionBehavior::CanJoinAllSpaces;
                behavior |= NSWindowCollectionBehavior::FullScreenAuxiliary;
            } else {
                behavior &= !NSWindowCollectionBehavior::CanJoinAllSpaces;
                behavior &= !NSWindowCollectionBehavior::FullScreenAuxiliary;
            }

            native_window.setCollectionBehavior(behavior);
        })
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
fn set_macos_window_opacity(window: &WebviewWindow, opacity: f64) -> Result<(), String> {
    use objc2_app_kit::NSWindow;

    let opacity = opacity.clamp(0.05, 1.0);
    window
        .with_webview(move |webview| unsafe {
            let native_window: &NSWindow = &*webview.ns_window().cast();
            native_window.setAlphaValue(opacity);
        })
        .map_err(|error| error.to_string())
}

#[cfg(not(target_os = "macos"))]
fn set_macos_fullscreen_companion(_window: &WebviewWindow, _visible: bool) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn set_window_mode(window: WebviewWindow, compact: bool) -> Result<(), String> {
    if compact {
        window
            .set_min_size(None::<LogicalSize<f64>>)
            .map_err(|error| error.to_string())?;
        window
            .set_decorations(false)
            .map_err(|error| error.to_string())?;
        window
            .set_resizable(false)
            .map_err(|error| error.to_string())?;
        window
            .set_size(LogicalSize::new(COMPACT_WIDTH, COMPACT_HEIGHT))
            .map_err(|error| error.to_string())?;
        window
            .set_always_on_top(true)
            .map_err(|error| error.to_string())?;
        set_macos_fullscreen_companion(&window, true)?;

        if let Some(monitor) = window
            .current_monitor()
            .map_err(|error| error.to_string())?
        {
            let work_area = monitor.work_area();
            let (x, y) = compact_position(
                (work_area.position.x, work_area.position.y),
                (work_area.size.width, work_area.size.height),
                monitor.scale_factor(),
            );
            window
                .set_position(PhysicalPosition::new(x, y))
                .map_err(|error| error.to_string())?;
        }
    } else {
        #[cfg(target_os = "macos")]
        set_macos_window_opacity(&window, 1.0)?;
        set_macos_fullscreen_companion(&window, false)?;
        window
            .set_always_on_top(false)
            .map_err(|error| error.to_string())?;
        window
            .set_decorations(true)
            .map_err(|error| error.to_string())?;
        window
            .set_min_size(Some(LogicalSize::new(760.0, 640.0)))
            .map_err(|error| error.to_string())?;
        window
            .set_size(LogicalSize::new(FULL_WIDTH, FULL_HEIGHT))
            .map_err(|error| error.to_string())?;
        window.center().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn set_window_opacity(window: WebviewWindow, opacity: f64) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        set_macos_window_opacity(&window, opacity)?;
        return Ok(true);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, opacity);
        Ok(false)
    }
}

#[tauri::command]
fn close_window(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|error| error.to_string())
}

#[tauri::command]
fn start_window_drag(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            detect_ai_session,
            set_window_mode,
            set_window_opacity,
            close_window,
            start_window_drag
        ])
        .run(tauri::generate_context!())
        .expect("error while running gyeot");
}

#[cfg(test)]
mod tests {
    use super::{compact_position, identify_ai_tool};

    #[test]
    fn recognizes_codex_cli_names_on_mac_and_windows() {
        assert_eq!(
            identify_ai_tool("codex", "/usr/local/bin/codex", "codex"),
            Some("Codex")
        );
        assert_eq!(
            identify_ai_tool("codex.exe", r"C:\\Tools\\codex.exe", "codex"),
            Some("Codex")
        );
        assert_eq!(
            identify_ai_tool(
                "codex-aarch64-apple-darwin",
                "/tmp/codex-aarch64-apple-darwin",
                "codex"
            ),
            Some("Codex")
        );
    }

    #[test]
    fn ignores_codex_desktop_background_services() {
        assert_eq!(
            identify_ai_tool(
                "codex",
                "/Applications/ChatGPT.app/Contents/Resources/codex",
                "codex app-server --analytics-default-enabled"
            ),
            None
        );
        assert_eq!(
            identify_ai_tool(
                "codex-code-mode-host",
                "/Applications/ChatGPT.app/Contents/Resources/codex-code-mode-host",
                "codex-code-mode-host"
            ),
            None
        );
        assert_eq!(
            identify_ai_tool(
                "codex",
                "/Applications/ChatGPT.app/Contents/Resources/codex",
                "codex sandbox -- node kernel.js"
            ),
            None
        );
    }

    #[test]
    fn ignores_codex_code_mode_host_launcher() {
        assert_eq!(
            identify_ai_tool(
                "codex",
                "/Applications/ChatGPT.app/Contents/Resources/codex",
                "codex -c features.code_mode_host=true"
            ),
            None
        );
    }

    #[test]
    fn detects_recent_session_file_writes_by_mtime_only() {
        use std::time::{Duration, SystemTime};

        let root = std::env::temp_dir().join(format!("gyeot-scan-test-{}", std::process::id()));
        let nested = root.join("2026").join("08");
        std::fs::create_dir_all(&nested).unwrap();
        std::fs::write(nested.join("rollout.jsonl"), b"{}\n").unwrap();
        std::fs::write(nested.join("notes.txt"), b"ignored").unwrap();

        let window = Duration::from_secs(300);
        assert!(super::has_recent_session_write(
            &root,
            SystemTime::now(),
            window
        ));
        // 기준 시각을 창 너머 미래로 옮기면 방금 만든 파일도 오래된 것으로 판정된다.
        assert!(!super::has_recent_session_write(
            &root,
            SystemTime::now() + Duration::from_secs(3_600),
            window
        ));
        assert!(!super::has_recent_session_write(
            &root.join("missing"),
            SystemTime::now(),
            window
        ));

        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn recognizes_claude_code_without_matching_helpers() {
        assert_eq!(
            identify_ai_tool("claude", "/Users/me/.local/bin/claude", "claude"),
            Some("Claude Code")
        );
        assert_eq!(
            identify_ai_tool("Claude Helper", "/Applications/Claude Helper", ""),
            None
        );
    }

    #[test]
    fn ignores_idle_claude_desktop_but_keeps_its_code_session() {
        let desktop_path = "/Applications/Claude.app/Contents/MacOS/Claude";
        assert_eq!(identify_ai_tool("Claude", desktop_path, desktop_path), None);

        let session_path = "/Users/me/Library/Application Support/Claude/claude-code/claude";
        assert_eq!(
            identify_ai_tool(
                "claude",
                session_path,
                "claude --output-format stream-json --resume abc123"
            ),
            Some("Claude Code")
        );
    }

    #[test]
    fn places_compact_window_inside_the_work_area() {
        assert_eq!(compact_position((0, 0), (1920, 1040), 1.0), (1632, 886));
        assert_eq!(
            compact_position((-3024, 0), (3024, 1890), 2.0),
            (-576, 1582)
        );
    }
}
