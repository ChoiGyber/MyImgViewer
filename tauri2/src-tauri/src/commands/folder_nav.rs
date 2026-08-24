use crate::image_formats;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};

fn is_image_ext(ext: &str) -> bool {
    image_formats::is_image_ext(ext)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThumbnailItem {
    pub file_path: String,
    pub file_name: String,
    pub thumbnail: String,
    #[serde(rename = "type")]
    pub item_type: String,
}

#[tauri::command]
pub fn folder_list_dirs(dir_path: String) -> Vec<String> {
    let path = PathBuf::from(&dir_path);
    let mut dirs: Vec<String> = fs::read_dir(&path)
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
                .filter_map(|e| e.file_name().to_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    dirs.sort_by(|a, b| natord::compare(a, b));
    dirs
}

#[tauri::command]
pub fn folder_list(dir_path: String) -> Vec<String> {
    let path = PathBuf::from(&dir_path);
    let mut files: Vec<PathBuf> = fs::read_dir(&path)
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| {
                    p.is_file()
                        && p.extension()
                            .and_then(|e| e.to_str())
                            .map(|e| is_image_ext(e))
                            .unwrap_or(false)
                })
                .collect()
        })
        .unwrap_or_default();

    files.sort_by(|a, b| {
        natord::compare(
            a.file_name().unwrap_or_default().to_str().unwrap_or(""),
            b.file_name().unwrap_or_default().to_str().unwrap_or(""),
        )
    });

    files
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect()
}

#[tauri::command]
pub fn folder_thumbnails(dir_path: String) -> Vec<ThumbnailItem> {
    let path = PathBuf::from(&dir_path);
    let entries = match fs::read_dir(&path) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    let mut all: Vec<fs::DirEntry> = entries.filter_map(|e| e.ok()).collect();
    all.sort_by(|a, b| {
        natord::compare(
            a.file_name().to_str().unwrap_or(""),
            b.file_name().to_str().unwrap_or(""),
        )
    });

    let mut results = Vec::new();

    // Directories first
    for entry in &all {
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            results.push(ThumbnailItem {
                file_path: entry.path().to_string_lossy().to_string(),
                file_name: entry.file_name().to_string_lossy().to_string(),
                thumbnail: String::new(),
                item_type: "folder".to_string(),
            });
        }
    }

    // Files (images and PDFs)
    for entry in &all {
        if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            continue;
        }
        let file_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        if ext == "pdf" {
            results.push(ThumbnailItem {
                file_path: file_path.to_string_lossy().to_string(),
                file_name,
                thumbnail: String::new(),
                item_type: "pdf".to_string(),
            });
        } else if is_image_ext(&ext) {
            let thumbnail = generate_thumbnail(&file_path);
            results.push(ThumbnailItem {
                file_path: file_path.to_string_lossy().to_string(),
                file_name,
                thumbnail,
                item_type: "image".to_string(),
            });
        }
    }

    results
}

fn generate_thumbnail(path: &Path) -> String {
    let data = match fs::read(path) {
        Ok(d) => d,
        Err(_) => return String::new(),
    };
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    let img = match image_formats::decode_image(&data, ext) {
        Ok(Some(i)) => i,
        Ok(None) => return String::new(),
        Err(_) => return String::new(),
    };

    let thumb = img.resize_to_fill(120, 120, image::imageops::FilterType::Triangle);
    let mut buf = Cursor::new(Vec::new());
    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 60);
    match thumb.write_with_encoder(encoder) {
        Ok(_) => {
            let b64 = STANDARD.encode(buf.into_inner());
            format!("data:image/jpeg;base64,{}", b64)
        }
        Err(_) => String::new(),
    }
}

#[tauri::command]
pub fn shell_open_path(file_path: String) -> Result<(), String> {
    opener::open(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_quick_paths() -> std::collections::HashMap<String, String> {
    let mut paths = std::collections::HashMap::new();
    if let Some(home) = dirs::home_dir() {
        paths.insert("home".to_string(), home.to_string_lossy().to_string());
    }
    if let Some(pics) = dirs::picture_dir() {
        paths.insert("pictures".to_string(), pics.to_string_lossy().to_string());
    }
    if let Some(dl) = dirs::download_dir() {
        paths.insert("downloads".to_string(), dl.to_string_lossy().to_string());
    }
    if let Some(docs) = dirs::document_dir() {
        paths.insert("documents".to_string(), docs.to_string_lossy().to_string());
    }
    paths
}

#[tauri::command]
pub fn get_screenshots_dir() -> Result<String, String> {
    let pics = dirs::picture_dir().ok_or("Pictures 디렉토리를 찾을 수 없습니다")?;
    let screenshots = pics.join("Screenshots");
    fs::create_dir_all(&screenshots).map_err(|e| e.to_string())?;
    Ok(screenshots.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn folder_navigation_accepts_extended_and_iphone_extensions() {
        let cases = ["jpe", "jfif", "ico", "tga", "qoi", "heic", "heif", "hif"];

        for case in cases {
            assert!(is_image_ext(case), "{case} should be listed as an image");
            assert!(
                is_image_ext(&case.to_uppercase()),
                "{case} should be case-insensitive"
            );
        }
    }
}
