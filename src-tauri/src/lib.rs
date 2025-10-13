#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init()) // add plugin here
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
