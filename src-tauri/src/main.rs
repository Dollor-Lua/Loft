#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

#[tauri::command]
async fn exists(path: std::path::PathBuf) -> bool {
  path.exists()
}

#[tauri::command]
async fn invoke(path: std::path::PathBuf, pargs: Vec<String>) -> bool {
  use std::process::Command;

  let mut cmd = Command::new(path.as_os_str());
  for arg in &pargs {
    cmd.arg(arg);
  }

  cmd.output().expect("failed to execute command");

  return true;
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![exists])
    .invoke_handler(tauri::generate_handler![invoke])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
