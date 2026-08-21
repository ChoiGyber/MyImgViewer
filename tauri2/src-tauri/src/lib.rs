mod commands;

use commands::image_history::HistoryState;
use std::sync::Mutex;

const IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "webp", "avif", "tiff", "tif", "gif", "bmp", "svg",
];

fn find_image_arg(args: &[String]) -> Option<String> {
    args.iter().skip(1).find(|a| {
        let lower = a.to_lowercase();
        IMAGE_EXTENSIONS
            .iter()
            .any(|e| lower.ends_with(&format!(".{}", e)))
            && std::path::Path::new(a).exists()
    }).cloned()
}

/// File passed on first launch (file association / command line).
/// The frontend pulls this on mount to avoid an emit-before-listen race.
#[tauri::command]
fn get_startup_file() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    find_image_arg(&args)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            use tauri::{Emitter, Manager};
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
            if let Some(file) = find_image_arg(&args) {
                let _ = app.emit("file:open", file);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        .manage(Mutex::new(HistoryState::default()))
        .invoke_handler(tauri::generate_handler![
            get_startup_file,
            // image_io
            commands::image_io::image_load,
            commands::image_io::preview_load_pdf,
            commands::image_io::folder_get_images,
            // image_process
            commands::image_process::image_convert,
            commands::image_process::image_resize,
            commands::image_process::image_transform,
            commands::image_process::image_copy_to_clipboard,
            commands::image_process::image_delete,
            // folder_nav
            commands::folder_nav::folder_list_dirs,
            commands::folder_nav::folder_list,
            commands::folder_nav::folder_thumbnails,
            commands::folder_nav::shell_open_path,
            commands::folder_nav::get_quick_paths,
            commands::folder_nav::get_screenshots_dir,
            // image_batch
            commands::image_batch::batch_resize,
            commands::image_batch::batch_transform,
            commands::image_batch::batch_convert,
            // image_history
            commands::image_history::history_before_edit,
            commands::image_history::history_undo,
            commands::image_history::history_redo,
            // screen_capture
            commands::screen_capture::capture_get_sources,
            commands::screen_capture::capture_window_and_save,
            commands::screen_capture::capture_get_screen_sources,
            commands::screen_capture::capture_full_screen_and_save,
            commands::screen_capture::capture_screen,
            commands::screen_capture::capture_crop_and_save,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
