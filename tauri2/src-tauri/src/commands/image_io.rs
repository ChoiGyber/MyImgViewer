use crate::image_formats;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

fn is_image_file(path: &Path) -> bool {
    image_formats::is_image_file(path)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageData {
    pub file_path: String,
    pub file_name: String,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub size: u64,
    pub data_url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderImages {
    pub files: Vec<String>,
    pub current_index: usize,
}

#[tauri::command]
pub fn image_load(file_path: String) -> Result<ImageData, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("파일이 존재하지 않습니다: {}", file_path));
    }

    let data = fs::read(&path).map_err(|e| format!("파일 읽기 실패: {}", e))?;
    let metadata = fs::metadata(&path).map_err(|e| format!("메타데이터 읽기 실패: {}", e))?;
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let decoded = image_formats::decode_image(&data, &ext)?;
    let (width, height) = image_formats::image_dimensions(decoded.as_ref());
    let data_url = image_formats::data_url_for_display(&data, &ext, decoded.as_ref())?;

    Ok(ImageData {
        file_path: path.to_string_lossy().to_string(),
        file_name,
        width,
        height,
        format: ext.clone(),
        size: metadata.len(),
        data_url,
    })
}

#[tauri::command]
pub fn preview_load_pdf(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("파일이 존재하지 않습니다: {}", file_path));
    }
    let data = fs::read(&path).map_err(|e| e.to_string())?;
    let b64 = STANDARD.encode(&data);
    Ok(format!("data:application/pdf;base64,{}", b64))
}

#[tauri::command]
pub fn folder_get_images(file_path: String) -> Result<FolderImages, String> {
    let path = PathBuf::from(&file_path);
    let dir = path.parent().ok_or("부모 디렉토리를 찾을 수 없습니다")?;

    let mut image_files: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_file() && is_image_file(p))
        .collect();

    image_files.sort_by(|a, b| {
        natord::compare(
            a.file_name().unwrap_or_default().to_str().unwrap_or(""),
            b.file_name().unwrap_or_default().to_str().unwrap_or(""),
        )
    });

    let files: Vec<String> = image_files
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    let current_index = files
        .iter()
        .position(|f| Path::new(f).canonicalize().ok() == path.canonicalize().ok())
        .or_else(|| files.iter().position(|f| f == &file_path))
        .unwrap_or(0);

    Ok(FolderImages {
        files,
        current_index,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn image_file_detection_accepts_extended_and_iphone_extensions() {
        let cases = [
            "photo.JPE",
            "photo.jfif",
            "icon.ico",
            "scan.tga",
            "texture.qoi",
            "iphone.HEIC",
            "iphone.heif",
            "iphone.hif",
        ];

        for case in cases {
            assert!(
                is_image_file(Path::new(case)),
                "{case} should be treated as an image"
            );
        }
    }

    #[test]
    fn mime_mapping_covers_extended_display_extensions() {
        assert_eq!(image_formats::mime_from_ext("jpe"), "image/jpeg");
        assert_eq!(image_formats::mime_from_ext("jfif"), "image/jpeg");
        assert_eq!(image_formats::mime_from_ext("ico"), "image/x-icon");
        assert_eq!(image_formats::mime_from_ext("apng"), "image/png");
        assert_eq!(image_formats::mime_from_ext("heic"), "image/heic");
        assert_eq!(image_formats::mime_from_ext("heif"), "image/heif");
    }
}
