use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, ImageFormat};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Cursor;
use std::path::PathBuf;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertOptions {
    pub file_path: String,
    pub output_format: String,
    pub quality: u8,
    pub output_path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeOptions {
    pub file_path: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fit: String,
    pub output_path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformOptions {
    pub file_path: String,
    pub rotate: Option<i32>,
    pub flip_h: Option<bool>,
    pub flip_v: Option<bool>,
    pub output_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessResult {
    pub success: bool,
    pub output_path: String,
}

fn str_to_format(fmt: &str) -> Option<ImageFormat> {
    match fmt {
        "jpeg" | "jpg" => Some(ImageFormat::Jpeg),
        "png" => Some(ImageFormat::Png),
        "webp" => Some(ImageFormat::WebP),
        "avif" => Some(ImageFormat::Avif),
        "tiff" => Some(ImageFormat::Tiff),
        "gif" => Some(ImageFormat::Gif),
        "bmp" => Some(ImageFormat::Bmp),
        _ => None,
    }
}

fn save_image(img: &DynamicImage, path: &str, format: &str, quality: u8) -> Result<(), String> {
    let fmt = str_to_format(format).ok_or(format!("지원하지 않는 포맷: {}", format))?;

    match fmt {
        ImageFormat::Jpeg => {
            let mut buf = Cursor::new(Vec::new());
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
            img.write_with_encoder(encoder).map_err(|e| e.to_string())?;
            fs::write(path, buf.into_inner()).map_err(|e| e.to_string())?;
        }
        _ => {
            img.save_with_format(path, fmt).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn resize_image(img: &DynamicImage, width: Option<u32>, height: Option<u32>, fit: &str) -> DynamicImage {
    let (orig_w, orig_h) = img.dimensions();

    let (target_w, target_h) = match (width, height) {
        (Some(w), Some(h)) => (w, h),
        (Some(w), None) => {
            let h = (orig_h as f64 * w as f64 / orig_w as f64).round() as u32;
            (w, h)
        }
        (None, Some(h)) => {
            let w = (orig_w as f64 * h as f64 / orig_h as f64).round() as u32;
            (w, h)
        }
        (None, None) => return img.clone(),
    };

    match fit {
        "contain" | "inside" => img.resize(target_w, target_h, FilterType::Lanczos3),
        "cover" => img.resize_to_fill(target_w, target_h, FilterType::Lanczos3),
        "fill" => img.resize_exact(target_w, target_h, FilterType::Lanczos3),
        _ => img.resize(target_w, target_h, FilterType::Lanczos3),
    }
}

pub fn transform_image(img: &DynamicImage, rotate: Option<i32>, flip_h: Option<bool>, flip_v: Option<bool>) -> DynamicImage {
    let mut result = img.clone();

    if let Some(deg) = rotate {
        result = match deg % 360 {
            90 | -270 => result.rotate90(),
            180 | -180 => result.rotate180(),
            270 | -90 => result.rotate270(),
            _ => result,
        };
    }

    if flip_h.unwrap_or(false) {
        result = result.fliph();
    }
    if flip_v.unwrap_or(false) {
        result = result.flipv();
    }

    result
}

fn detect_format_from_path(path: &str) -> &str {
    let ext = PathBuf::from(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => "jpeg",
        "png" => "png",
        "webp" => "webp",
        "avif" => "avif",
        "tiff" | "tif" => "tiff",
        "gif" => "gif",
        "bmp" => "bmp",
        _ => "png",
    }
}

#[tauri::command]
pub fn image_convert(options: ConvertOptions) -> Result<ProcessResult, String> {
    let data = fs::read(&options.file_path).map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;
    save_image(&img, &options.output_path, &options.output_format, options.quality)?;
    Ok(ProcessResult {
        success: true,
        output_path: options.output_path,
    })
}

#[tauri::command]
pub fn image_resize(options: ResizeOptions) -> Result<ProcessResult, String> {
    let data = fs::read(&options.file_path).map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;
    let resized = resize_image(&img, options.width, options.height, &options.fit);
    let fmt = detect_format_from_path(&options.output_path);
    save_image(&resized, &options.output_path, fmt, 92)?;
    Ok(ProcessResult {
        success: true,
        output_path: options.output_path,
    })
}

#[tauri::command]
pub fn image_transform(options: TransformOptions) -> Result<ProcessResult, String> {
    let data = fs::read(&options.file_path).map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;
    let transformed = transform_image(&img, options.rotate, options.flip_h, options.flip_v);
    let fmt = detect_format_from_path(&options.output_path);
    save_image(&transformed, &options.output_path, fmt, 92)?;
    Ok(ProcessResult {
        success: true,
        output_path: options.output_path,
    })
}

#[tauri::command]
pub fn image_copy_to_clipboard(file_path: String) -> Result<(), String> {
    let data = fs::read(&file_path).map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();

    let img_data = arboard::ImageData {
        width: w as usize,
        height: h as usize,
        bytes: rgba.into_raw().into(),
    };

    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_image(img_data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn image_delete(file_path: String) -> Result<(), String> {
    trash::delete(&file_path).map_err(|e| e.to_string())
}
