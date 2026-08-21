use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::fs;
use std::io::Cursor;
use std::path::PathBuf;

fn random_file_name() -> String {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let rand: u32 = rand::random();
    format!("capture_{}_{:x}.jpg", ts, rand % 0xFFFF)
}

fn save_jpeg(img: &image::DynamicImage, path: &str) -> Result<(), String> {
    let mut buf = Cursor::new(Vec::new());
    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 92);
    img.write_with_encoder(encoder).map_err(|e| e.to_string())?;
    fs::write(path, buf.into_inner()).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenSource {
    pub id: String,
    pub name: String,
    pub thumbnail: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureResult {
    pub file_path: String,
    pub screenshots_dir: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenCaptureData {
    pub data_url: String,
    pub screen_width: u32,
    pub screen_height: u32,
    pub scale_factor: f64,
}

#[tauri::command]
pub fn capture_get_screen_sources() -> Result<Vec<ScreenSource>, String> {
    let screens = screenshots::Screen::all().map_err(|e| e.to_string())?;
    let mut sources = Vec::new();

    for (i, screen) in screens.iter().enumerate() {
        let info = screen.display_info;
        let name = format!(
            "모니터 {} ({}x{})",
            i + 1,
            info.width,
            info.height
        );

        // Capture thumbnail
        let thumbnail = match screen.capture() {
            Ok(img) => {
                let dyn_img = image::DynamicImage::ImageRgba8(
                    image::RgbaImage::from_raw(img.width(), img.height(), img.into_raw())
                        .unwrap_or_default(),
                );
                let thumb = dyn_img.resize(300, 200, image::imageops::FilterType::Triangle);
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
            Err(_) => String::new(),
        };

        sources.push(ScreenSource {
            id: format!("screen:{}", info.id),
            name,
            thumbnail,
            width: info.width,
            height: info.height,
        });
    }

    Ok(sources)
}

fn thumbnail_data_url(dyn_img: &image::DynamicImage) -> String {
    let thumb = dyn_img.resize(300, 200, image::imageops::FilterType::Triangle);
    let mut buf = Cursor::new(Vec::new());
    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 60);
    match thumb.write_with_encoder(encoder) {
        Ok(_) => format!("data:image/jpeg;base64,{}", STANDARD.encode(buf.into_inner())),
        Err(_) => String::new(),
    }
}

fn copy_image_to_clipboard(dyn_img: &image::DynamicImage) {
    let rgba = dyn_img.to_rgba8();
    let (w, h) = rgba.dimensions();
    let img_data = arboard::ImageData {
        width: w as usize,
        height: h as usize,
        bytes: rgba.into_raw().into(),
    };
    if let Ok(mut clipboard) = arboard::Clipboard::new() {
        let _ = clipboard.set_image(img_data);
    }
}

#[tauri::command]
pub fn capture_get_sources() -> Result<Vec<ScreenSource>, String> {
    let windows = xcap::Window::all().map_err(|e| e.to_string())?;
    let mut sources = Vec::new();

    for w in windows.iter() {
        let title = w.title().unwrap_or_default();
        if title.trim().is_empty() {
            continue;
        }
        if w.is_minimized().unwrap_or(true) {
            continue;
        }
        let width = w.width().unwrap_or(0);
        let height = w.height().unwrap_or(0);
        if width < 50 || height < 50 {
            continue;
        }
        let id = w.id().unwrap_or(0);

        // Skip windows that cannot be captured (system overlays etc.)
        let thumbnail = match w.capture_image() {
            Ok(img) => thumbnail_data_url(&image::DynamicImage::ImageRgba8(img)),
            Err(_) => continue,
        };

        sources.push(ScreenSource {
            id: format!("window:{}", id),
            name: title,
            thumbnail,
            width,
            height,
        });
    }

    Ok(sources)
}

#[tauri::command]
pub fn capture_window_and_save(source_id: String) -> Result<CaptureResult, String> {
    let id: u32 = source_id
        .strip_prefix("window:")
        .unwrap_or(&source_id)
        .parse()
        .map_err(|_| "잘못된 창 ID".to_string())?;

    let windows = xcap::Window::all().map_err(|e| e.to_string())?;
    let window = windows
        .into_iter()
        .find(|w| w.id().map(|wid| wid == id).unwrap_or(false))
        .ok_or("창을 찾을 수 없습니다")?;

    let img = window.capture_image().map_err(|e| e.to_string())?;
    let dyn_img = image::DynamicImage::ImageRgba8(img);

    let screenshots_dir = get_screenshots_dir()?;
    let file_path = PathBuf::from(&screenshots_dir)
        .join(random_file_name())
        .to_string_lossy()
        .to_string();

    save_jpeg(&dyn_img, &file_path)?;
    copy_image_to_clipboard(&dyn_img);

    Ok(CaptureResult {
        file_path,
        screenshots_dir,
    })
}

#[tauri::command]
pub fn capture_full_screen_and_save() -> Result<CaptureResult, String> {
    let screens = screenshots::Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.first().ok_or("스크린을 찾을 수 없습니다")?;

    let capture = screen.capture().map_err(|e| e.to_string())?;
    let rgba = image::RgbaImage::from_raw(capture.width(), capture.height(), capture.into_raw())
        .ok_or("이미지 변환 실패")?;
    let dyn_img = image::DynamicImage::ImageRgba8(rgba);

    let screenshots_dir = get_screenshots_dir()?;
    let file_name = random_file_name();
    let file_path = PathBuf::from(&screenshots_dir)
        .join(&file_name)
        .to_string_lossy()
        .to_string();

    save_jpeg(&dyn_img, &file_path)?;

    // Copy to clipboard
    let rgba = dyn_img.to_rgba8();
    let (w, h) = rgba.dimensions();
    let img_data = arboard::ImageData {
        width: w as usize,
        height: h as usize,
        bytes: rgba.into_raw().into(),
    };
    if let Ok(mut clipboard) = arboard::Clipboard::new() {
        let _ = clipboard.set_image(img_data);
    }

    Ok(CaptureResult {
        file_path,
        screenshots_dir,
    })
}

#[tauri::command]
pub fn capture_screen(screen_index: Option<usize>) -> Result<ScreenCaptureData, String> {
    let screens = screenshots::Screen::all().map_err(|e| e.to_string())?;
    let idx = screen_index.unwrap_or(0);
    let screen = screens.get(idx).or(screens.first()).ok_or("스크린을 찾을 수 없습니다")?;

    let info = screen.display_info;
    let capture = screen.capture().map_err(|e| e.to_string())?;
    let rgba = image::RgbaImage::from_raw(capture.width(), capture.height(), capture.into_raw())
        .ok_or("이미지 변환 실패")?;
    let dyn_img = image::DynamicImage::ImageRgba8(rgba);

    let mut buf = Cursor::new(Vec::new());
    dyn_img
        .write_to(&mut buf, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let b64 = STANDARD.encode(buf.into_inner());
    let data_url = format!("data:image/png;base64,{}", b64);

    Ok(ScreenCaptureData {
        data_url,
        screen_width: info.width,
        screen_height: info.height,
        scale_factor: info.scale_factor as f64,
    })
}

#[tauri::command]
pub fn capture_crop_and_save(
    data_url: String,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    folder_path: String,
) -> Result<String, String> {
    let b64 = data_url
        .split(",")
        .nth(1)
        .ok_or("잘못된 data URL")?;
    let data = STANDARD.decode(b64).map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;

    let cropped = img.crop_imm(x, y, width, height);

    let file_name = random_file_name();
    let file_path = PathBuf::from(&folder_path)
        .join(&file_name)
        .to_string_lossy()
        .to_string();

    save_jpeg(&cropped, &file_path)?;

    // Copy to clipboard
    let rgba = cropped.to_rgba8();
    let (w, h) = rgba.dimensions();
    let img_data = arboard::ImageData {
        width: w as usize,
        height: h as usize,
        bytes: rgba.into_raw().into(),
    };
    if let Ok(mut clipboard) = arboard::Clipboard::new() {
        let _ = clipboard.set_image(img_data);
    }

    Ok(file_path)
}

fn get_screenshots_dir() -> Result<String, String> {
    let pics = dirs::picture_dir().ok_or("Pictures 디렉토리를 찾을 수 없습니다")?;
    let dir = pics.join("Screenshots");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}
