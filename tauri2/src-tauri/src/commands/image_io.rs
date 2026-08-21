use base64::{engine::general_purpose::STANDARD, Engine};
use image::GenericImageView;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "webp", "avif", "tiff", "tif", "gif", "bmp", "svg",
];

fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| IMAGE_EXTENSIONS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn mime_from_ext(ext: &str) -> &str {
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "tiff" | "tif" => "image/tiff",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        _ => "image/png",
    }
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

    let decoded = if ext == "svg" {
        None
    } else {
        image::load_from_memory(&data).ok()
    };
    let (width, height) = decoded.as_ref().map(|i| i.dimensions()).unwrap_or((0, 0));

    // WebView2 cannot render TIFF - transcode to JPEG for display
    let mut mime = mime_from_ext(&ext).to_string();
    let mut payload = data;
    if matches!(ext.as_str(), "tiff" | "tif") {
        if let Some(img) = &decoded {
            let mut buf = std::io::Cursor::new(Vec::new());
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 92);
            if img.write_with_encoder(encoder).is_ok() {
                payload = buf.into_inner();
                mime = "image/jpeg".to_string();
            }
        }
    }

    let b64 = STANDARD.encode(&payload);
    let data_url = format!("data:{};base64,{}", mime, b64);

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
        .position(|f| {
            Path::new(f).canonicalize().ok() == path.canonicalize().ok()
        })
        .or_else(|| {
            files.iter().position(|f| f == &file_path)
        })
        .unwrap_or(0);

    Ok(FolderImages {
        files,
        current_index,
    })
}
