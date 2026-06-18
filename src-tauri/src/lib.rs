use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::Manager;

// ──────────────────────────────────────────────────────────────────────────────
// 경로 헬퍼
// ──────────────────────────────────────────────────────────────────────────────

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir 취득 실패: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn files_dir_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = data_dir(app)?.join("files");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("finder.json"))
}

fn ext_of(path: &str) -> String {
    Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default()
}

fn stored_name(id: &str, ext: &str) -> String {
    if ext.is_empty() {
        id.to_string()
    } else {
        format!("{id}.{ext}")
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// 커맨드
// ──────────────────────────────────────────────────────────────────────────────

/// finder.json 을 읽어 노드 배열(JSON)을 반환. 없으면 빈 배열.
/// 파싱 실패 시 기존 파일을 .bak 으로 백업하고 빈 배열을 반환한다.
#[tauri::command]
fn load_store(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let path = store_path(&app)?;
    let raw = match std::fs::read_to_string(&path) {
        Ok(s) => s,
        Err(_) => return Ok(serde_json::json!([])),
    };
    match serde_json::from_str::<serde_json::Value>(&raw) {
        Ok(v) if v.is_array() => Ok(v),
        _ => {
            let bak = path.with_extension("json.bak");
            let _ = std::fs::copy(&path, &bak);
            Ok(serde_json::json!([]))
        }
    }
}

/// 노드 배열(JSON)을 finder.json 에 저장한다.
#[tauri::command]
fn save_store(app: tauri::AppHandle, nodes: serde_json::Value) -> Result<(), String> {
    let path = store_path(&app)?;
    let json = serde_json::to_string_pretty(&nodes).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

/// src_path 의 파일을 files/{id}.{ext} 로 복사하고 저장된 파일명을 반환한다.
#[tauri::command]
fn import_file(app: tauri::AppHandle, src_path: String, id: String) -> Result<String, String> {
    let ext = ext_of(&src_path);
    let name = stored_name(&id, &ext);
    let dest = files_dir_path(&app)?.join(&name);
    std::fs::copy(&src_path, &dest).map_err(|e| format!("복사 실패: {e}"))?;
    Ok(name)
}

/// 바이트(클립보드 이미지 등)를 files/{id}.{ext} 로 저장하고 파일명을 반환한다.
#[tauri::command]
fn save_bytes(
    app: tauri::AppHandle,
    bytes: Vec<u8>,
    id: String,
    ext: String,
) -> Result<String, String> {
    let name = stored_name(&id, &ext);
    let dest = files_dir_path(&app)?.join(&name);
    std::fs::write(&dest, &bytes).map_err(|e| format!("저장 실패: {e}"))?;
    Ok(name)
}

/// 복사본 파일을 삭제한다 (노드 삭제 시).
#[tauri::command]
fn delete_file(app: tauri::AppHandle, stored_name: String) -> Result<(), String> {
    let path = files_dir_path(&app)?.join(&stored_name);
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// files/ 디렉터리의 절대경로를 반환한다 (convertFileSrc 조합용).
#[tauri::command]
fn files_dir(app: tauri::AppHandle) -> Result<String, String> {
    Ok(files_dir_path(&app)?.to_string_lossy().to_string())
}

/// 복사본 파일이 실제로 존재하는지 확인한다.
#[tauri::command]
fn file_exists(app: tauri::AppHandle, stored_name: String) -> Result<bool, String> {
    Ok(files_dir_path(&app)?.join(&stored_name).exists())
}

/// 노드 배열(JSON)과 참조 파일들을 .zip 번들로 내보낸다.
/// manifest.json(노드 메타) + files/<storedName>(복사본) 구조.
#[tauri::command]
fn export_bundle(
    app: tauri::AppHandle,
    nodes: serde_json::Value,
    dest_path: String,
) -> Result<(), String> {
    let files = files_dir_path(&app)?;
    let file = std::fs::File::create(&dest_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let opts = zip::write::SimpleFileOptions::default();

    zip.start_file("manifest.json", opts).map_err(|e| e.to_string())?;
    let manifest = serde_json::to_vec_pretty(&nodes).map_err(|e| e.to_string())?;
    zip.write_all(&manifest).map_err(|e| e.to_string())?;

    if let Some(arr) = nodes.as_array() {
        for n in arr {
            if let Some(name) = n.get("storedName").and_then(|v| v.as_str()) {
                let p = files.join(name);
                if let Ok(bytes) = std::fs::read(&p) {
                    zip.start_file(format!("files/{name}"), opts)
                        .map_err(|e| e.to_string())?;
                    zip.write_all(&bytes).map_err(|e| e.to_string())?;
                }
            }
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

/// .zip 번들을 읽어 manifest 노드 배열과, 파일을 새 이름으로 복사한 매핑을 반환한다.
/// 반환: { "nodes": [...], "rename": { "원래파일명": "새파일명" } }
#[tauri::command]
fn import_bundle(
    app: tauri::AppHandle,
    src_path: String,
) -> Result<serde_json::Value, String> {
    let files = files_dir_path(&app)?;
    let file = std::fs::File::open(&src_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let manifest: serde_json::Value = {
        let mut mf = archive
            .by_name("manifest.json")
            .map_err(|_| "번들에 manifest.json 이 없습니다".to_string())?;
        let mut s = String::new();
        mf.read_to_string(&mut s).map_err(|e| e.to_string())?;
        serde_json::from_str(&s).map_err(|e| e.to_string())?
    };

    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);

    let mut rename = serde_json::Map::new();
    let mut idx = 0u32;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();
        let Some(orig) = name.strip_prefix("files/") else {
            continue;
        };
        if orig.is_empty() {
            continue;
        }
        let ext = Path::new(orig)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        let newname = if ext.is_empty() {
            format!("imp-{nanos}-{idx}")
        } else {
            format!("imp-{nanos}-{idx}.{ext}")
        };
        idx += 1;
        let dest = files.join(&newname);
        let mut out = std::fs::File::create(&dest).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        rename.insert(orig.to_string(), serde_json::Value::String(newname));
    }

    Ok(serde_json::json!({ "nodes": manifest, "rename": serde_json::Value::Object(rename) }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_store,
            save_store,
            import_file,
            save_bytes,
            delete_file,
            files_dir,
            file_exists,
            export_bundle,
            import_bundle,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
