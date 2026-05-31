#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![choose_save_directory, save_chart_file])
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

#[tauri::command]
fn choose_save_directory() -> Result<Option<String>, String> {
  Ok(rfd::FileDialog::new()
    .set_title("Choose Saved Songs Folder")
    .pick_folder()
    .map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn save_chart_file(directory: String, file_name: String, contents: String) -> Result<String, String> {
  let folder = std::path::PathBuf::from(directory);
  if !folder.is_dir() {
    return Err("Selected save folder is not available.".to_string());
  }

  let safe_name = sanitize_file_name(&file_name);
  if safe_name.is_empty() {
    return Err("Song file name is empty.".to_string());
  }

  let path = folder.join(safe_name);
  std::fs::write(&path, contents).map_err(|err| err.to_string())?;
  Ok(path.to_string_lossy().to_string())
}

fn sanitize_file_name(file_name: &str) -> String {
  let fallback = "Untitled Chart.json";
  let source = std::path::Path::new(file_name)
    .file_name()
    .and_then(|name| name.to_str())
    .unwrap_or(fallback);

  let sanitized: String = source
    .chars()
    .map(|ch| match ch {
      '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
      ch if ch.is_control() => '_',
      ch => ch,
    })
    .collect();

  let trimmed = sanitized.trim_matches([' ', '.']).trim();
  if trimmed.is_empty() {
    fallback.to_string()
  } else if trimmed.to_lowercase().ends_with(".json") {
    trimmed.to_string()
  } else {
    format!("{trimmed}.json")
  }
}
