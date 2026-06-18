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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
