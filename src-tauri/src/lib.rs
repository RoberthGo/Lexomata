mod oauth_loopback;

#[cfg(target_os = "windows")]
fn show_windows_error(title: &str, message: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(
            hwnd: *mut core::ffi::c_void,
            text: *const u16,
            caption: *const u16,
            utype: u32,
        ) -> i32;
    }

    let wide_msg: Vec<u16> = OsStr::new(message).encode_wide().chain(Some(0)).collect();
    let wide_title: Vec<u16> = OsStr::new(title).encode_wide().chain(Some(0)).collect();
    const MB_OK: u32 = 0x0000_0000;
    const MB_ICONERROR: u32 = 0x0000_0010;

    unsafe {
        MessageBoxW(
            core::ptr::null_mut(),
            wide_msg.as_ptr(),
            wide_title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            oauth_loopback::reserve_oauth_loopback,
            oauth_loopback::await_oauth_loopback,
        ])
        .run(tauri::generate_context!());

    if let Err(err) = result {
        let err_text = err.to_string();
        #[cfg(target_os = "windows")]
        {
            let lower = err_text.to_lowercase();
            if lower.contains("webview") {
                show_windows_error(
                    "Lexomata — Falta Microsoft Edge WebView2",
                    "Lexomata necesita Microsoft Edge WebView2 Runtime para ejecutarse en Windows.\n\nDescárgalo e instálalo gratis desde:\nhttps://developer.microsoft.com/microsoft-edge/webview2/",
                );
            } else {
                show_windows_error(
                    "Lexomata — Error al iniciar",
                    &format!("No se pudo iniciar Lexomata:\n\n{err_text}"),
                );
            }
        }
        #[cfg(not(target_os = "windows"))]
        panic!("error al iniciar Lexomata: {err_text}");
    }
}
