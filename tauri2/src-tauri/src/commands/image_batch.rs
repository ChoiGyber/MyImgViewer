use crate::image_formats;
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{Emitter, Window};

use super::image_process::{resize_image, transform_image};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchResizeOptions {
    pub file_paths: Vec<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub percent: Option<f64>,
    pub fit: String,
    pub output_dir: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTransformOptions {
    pub file_paths: Vec<String>,
    pub rotate: Option<i32>,
    pub flip_h: Option<bool>,
    pub flip_v: Option<bool>,
    pub output_dir: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertOptions {
    pub file_paths: Vec<String>,
    pub output_format: String,
    pub quality: u8,
    pub output_dir: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BatchProgress {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
}

#[derive(Serialize)]
pub struct BatchResult {
    pub file: String,
    pub success: bool,
    pub error: Option<String>,
}

fn ensure_dir(dir: &str) {
    let _ = fs::create_dir_all(dir);
}

fn detect_format(path: &Path) -> Result<&'static str, String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let format = match ext.as_str() {
        "jpg" | "jpeg" | "jpe" | "jfif" | "pjpeg" | "pjp" => "jpeg",
        "png" | "apng" => "png",
        "webp" => "webp",
        "avif" => "avif",
        "tiff" | "tif" => "tiff",
        "gif" => "gif",
        "bmp" | "dib" => "bmp",
        "ico" => "ico",
        "tga" | "targa" => "tga",
        "pnm" | "pbm" | "pgm" | "ppm" | "pam" => "pnm",
        "hdr" => "hdr",
        "exr" => "exr",
        "ff" | "farbfeld" => "ff",
        "qoi" => "qoi",
        _ => return Err(format!("저장을 지원하지 않는 확장자: .{}", ext)),
    };
    Ok(format)
}

fn save_image_fmt(
    img: &image::DynamicImage,
    path: &str,
    format: &str,
    quality: u8,
) -> Result<(), String> {
    use image::ImageFormat;
    use std::io::Cursor;

    let fmt = match format {
        "jpeg" | "jpg" | "jpe" | "jfif" | "pjpeg" | "pjp" => ImageFormat::Jpeg,
        "png" | "apng" => ImageFormat::Png,
        "webp" => ImageFormat::WebP,
        "avif" => ImageFormat::Avif,
        "tiff" | "tif" => ImageFormat::Tiff,
        "gif" => ImageFormat::Gif,
        "bmp" | "dib" => ImageFormat::Bmp,
        "ico" => ImageFormat::Ico,
        "tga" | "targa" => ImageFormat::Tga,
        "pnm" | "pbm" | "pgm" | "ppm" | "pam" => ImageFormat::Pnm,
        "hdr" => ImageFormat::Hdr,
        "exr" => ImageFormat::OpenExr,
        "ff" | "farbfeld" => ImageFormat::Farbfeld,
        "qoi" => ImageFormat::Qoi,
        _ => ImageFormat::Png,
    };

    if !fmt.writing_enabled() {
        return Err(format!("저장을 지원하지 않는 포맷: {}", format));
    }

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

#[tauri::command]
pub fn batch_resize(window: Window, options: BatchResizeOptions) -> Vec<BatchResult> {
    ensure_dir(&options.output_dir);
    let total = options.file_paths.len();
    let mut results = Vec::new();

    for (i, file_path) in options.file_paths.iter().enumerate() {
        let path = PathBuf::from(file_path);
        let file_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let _ = window.emit(
            "batch:progress",
            BatchProgress {
                current: i + 1,
                total,
                current_file: file_name.clone(),
            },
        );

        match (|| -> Result<(), String> {
            let img = image_formats::load_raster_image(Path::new(file_path))?;

            let (w, h) = if let Some(pct) = options.percent {
                if pct > 0.0 {
                    let (ow, oh) = img.dimensions();
                    (
                        Some((ow as f64 * pct / 100.0).round() as u32),
                        Some((oh as f64 * pct / 100.0).round() as u32),
                    )
                } else {
                    (options.width, options.height)
                }
            } else {
                (options.width, options.height)
            };

            let resized = resize_image(&img, w, h, &options.fit);
            let output_path = PathBuf::from(&options.output_dir).join(&file_name);
            let fmt = detect_format(&path)?;
            save_image_fmt(&resized, output_path.to_str().unwrap_or(""), fmt, 92)?;
            Ok(())
        })() {
            Ok(()) => results.push(BatchResult {
                file: file_name,
                success: true,
                error: None,
            }),
            Err(e) => results.push(BatchResult {
                file: file_name,
                success: false,
                error: Some(e),
            }),
        }
    }

    results
}

#[tauri::command]
pub fn batch_transform(window: Window, options: BatchTransformOptions) -> Vec<BatchResult> {
    ensure_dir(&options.output_dir);
    let total = options.file_paths.len();
    let mut results = Vec::new();

    for (i, file_path) in options.file_paths.iter().enumerate() {
        let path = PathBuf::from(file_path);
        let file_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let _ = window.emit(
            "batch:progress",
            BatchProgress {
                current: i + 1,
                total,
                current_file: file_name.clone(),
            },
        );

        match (|| -> Result<(), String> {
            let img = image_formats::load_raster_image(Path::new(file_path))?;
            let transformed = transform_image(&img, options.rotate, options.flip_h, options.flip_v);
            let output_path = PathBuf::from(&options.output_dir).join(&file_name);
            let fmt = detect_format(&path)?;
            save_image_fmt(&transformed, output_path.to_str().unwrap_or(""), fmt, 92)?;
            Ok(())
        })() {
            Ok(()) => results.push(BatchResult {
                file: file_name,
                success: true,
                error: None,
            }),
            Err(e) => results.push(BatchResult {
                file: file_name,
                success: false,
                error: Some(e),
            }),
        }
    }

    results
}

#[tauri::command]
pub fn batch_convert(window: Window, options: BatchConvertOptions) -> Vec<BatchResult> {
    ensure_dir(&options.output_dir);
    let total = options.file_paths.len();
    let mut results = Vec::new();

    for (i, file_path) in options.file_paths.iter().enumerate() {
        let path = PathBuf::from(file_path);
        let base_name = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let ext = if options.output_format == "jpeg" {
            "jpg"
        } else {
            &options.output_format
        };
        let output_file_name = format!("{}.{}", base_name, ext);

        let _ = window.emit(
            "batch:progress",
            BatchProgress {
                current: i + 1,
                total,
                current_file: output_file_name.clone(),
            },
        );

        match (|| -> Result<(), String> {
            let img = image_formats::load_raster_image(Path::new(file_path))?;
            let output_path = PathBuf::from(&options.output_dir).join(&output_file_name);
            save_image_fmt(
                &img,
                output_path.to_str().unwrap_or(""),
                &options.output_format,
                options.quality,
            )?;
            Ok(())
        })() {
            Ok(()) => results.push(BatchResult {
                file: output_file_name,
                success: true,
                error: None,
            }),
            Err(e) => results.push(BatchResult {
                file: path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                success: false,
                error: Some(e),
            }),
        }
    }

    results
}
