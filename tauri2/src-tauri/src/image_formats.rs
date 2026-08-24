use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, GenericImageView, ImageFormat, RgbaImage};
use std::fs;
use std::io::Cursor;
use std::path::Path;

pub const IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "jpe", "jfif", "pjpeg", "pjp", "png", "apng", "webp", "avif", "tiff", "tif",
    "gif", "bmp", "dib", "svg", "ico", "tga", "targa", "pnm", "pbm", "pgm", "ppm", "pam", "qoi",
    "dds", "hdr", "exr", "ff", "farbfeld", "heic", "heif", "hif", "heics", "heifs",
];

fn normalize_ext(ext: &str) -> String {
    ext.trim_start_matches('.').to_ascii_lowercase()
}

pub fn is_image_ext(ext: &str) -> bool {
    let ext = normalize_ext(ext);
    IMAGE_EXTENSIONS.contains(&ext.as_str())
}

pub fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(is_image_ext)
        .unwrap_or(false)
}

pub fn is_heif_ext(ext: &str) -> bool {
    matches!(
        normalize_ext(ext).as_str(),
        "heic" | "heif" | "hif" | "heics" | "heifs"
    )
}

pub fn mime_from_ext(ext: &str) -> &'static str {
    match normalize_ext(ext).as_str() {
        "jpg" | "jpeg" | "jpe" | "jfif" | "pjpeg" | "pjp" => "image/jpeg",
        "png" | "apng" => "image/png",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "tiff" | "tif" => "image/tiff",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "bmp" | "dib" => "image/bmp",
        "ico" => "image/x-icon",
        "heic" | "heics" => "image/heic",
        "heif" | "heifs" | "hif" => "image/heif",
        _ => "image/png",
    }
}

pub fn is_browser_displayable_ext(ext: &str) -> bool {
    matches!(
        normalize_ext(ext).as_str(),
        "jpg"
            | "jpeg"
            | "jpe"
            | "jfif"
            | "pjpeg"
            | "pjp"
            | "png"
            | "apng"
            | "webp"
            | "avif"
            | "gif"
            | "bmp"
            | "dib"
            | "svg"
            | "ico"
    )
}

pub fn decode_image(data: &[u8], ext: &str) -> Result<Option<DynamicImage>, String> {
    let ext = normalize_ext(ext);
    if ext == "svg" {
        return Ok(None);
    }
    if is_heif_ext(&ext) {
        return decode_heif(data).map(Some);
    }

    match image::load_from_memory(data) {
        Ok(img) => Ok(Some(img)),
        Err(err) if is_browser_displayable_ext(&ext) => {
            eprintln!("[image] metadata decode failed for .{}: {}", ext, err);
            Ok(None)
        }
        Err(err) => Err(format!("이미지 디코딩 실패(.{}): {}", ext, err)),
    }
}

pub fn decode_raster_image(data: &[u8], ext: &str) -> Result<DynamicImage, String> {
    decode_image(data, ext)?
        .ok_or_else(|| format!(".{} 파일은 픽셀 편집 기능에서 지원하지 않습니다", ext))
}

pub fn load_raster_image(path: &Path) -> Result<DynamicImage, String> {
    let data = fs::read(path).map_err(|e| e.to_string())?;
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    decode_raster_image(&data, ext)
}

pub fn data_url_for_display(
    data: &[u8],
    ext: &str,
    decoded: Option<&DynamicImage>,
) -> Result<String, String> {
    if is_browser_displayable_ext(ext) {
        let b64 = STANDARD.encode(data);
        return Ok(format!("data:{};base64,{}", mime_from_ext(ext), b64));
    }

    let img =
        decoded.ok_or_else(|| format!("표시용 변환에 필요한 디코딩 결과가 없습니다: .{}", ext))?;
    dynamic_image_to_png_data_url(img)
}

pub fn dynamic_image_to_png_data_url(img: &DynamicImage) -> Result<String, String> {
    let mut buf = Cursor::new(Vec::new());
    img.write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| format!("PNG 변환 실패: {}", e))?;
    let b64 = STANDARD.encode(buf.into_inner());
    Ok(format!("data:image/png;base64,{}", b64))
}

fn decode_heif(data: &[u8]) -> Result<DynamicImage, String> {
    let decoded =
        heif_oxide::decode_bytes(data).map_err(|e| format!("HEIC/HEIF 디코딩 실패: {}", e))?;
    let rgba = decoded.to_rgba8();
    let image = RgbaImage::from_raw(decoded.width, decoded.height, rgba)
        .ok_or_else(|| "HEIC/HEIF 픽셀 버퍼 크기가 올바르지 않습니다".to_string())?;
    Ok(DynamicImage::ImageRgba8(image))
}

pub fn image_dimensions(img: Option<&DynamicImage>) -> (u32, u32) {
    img.map(GenericImageView::dimensions).unwrap_or((0, 0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_extended_and_iphone_extensions() {
        let cases = ["JPE", ".jfif", "ico", "tga", "qoi", "HEIC", "heif", "hif"];

        for case in cases {
            assert!(
                is_image_ext(case),
                "{case} should be treated as an image extension"
            );
        }
    }

    #[test]
    fn maps_extended_mime_types() {
        assert_eq!(mime_from_ext("jpe"), "image/jpeg");
        assert_eq!(mime_from_ext("jfif"), "image/jpeg");
        assert_eq!(mime_from_ext("ico"), "image/x-icon");
        assert_eq!(mime_from_ext("apng"), "image/png");
        assert_eq!(mime_from_ext("heic"), "image/heic");
        assert_eq!(mime_from_ext("heif"), "image/heif");
    }
}
