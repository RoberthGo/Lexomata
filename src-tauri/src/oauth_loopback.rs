use serde::Serialize;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::Duration;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthLoopbackResult {
    pub code: String,
    pub state: Option<String>,
    pub redirect_uri: String,
}

fn extract_query_param(query: &str, target: &str) -> Option<String> {
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        let key = parts.next()?;
        let value = parts.next().unwrap_or("");
        if key == target {
            return Some(percent_decode(value));
        }
    }
    None
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(hex) = std::str::from_utf8(&bytes[i + 1..i + 3]) {
                if let Ok(val) = u8::from_str_radix(hex, 16) {
                    out.push(val);
                    i += 3;
                    continue;
                }
            }
        }
        out.push(if bytes[i] == b'+' { b' ' } else { bytes[i] });
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Abre un listener temporal en 127.0.0.1:0 para recibir el callback OAuth 2.0 PKCE.
#[tauri::command]
pub fn reserve_oauth_loopback() -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("No se pudo abrir loopback OAuth: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("No se pudo leer puerto loopback: {error}"))?
        .port();
    drop(listener);
    Ok(format!("http://127.0.0.1:{port}/callback"))
}

/// Espera una única petición HTTP en el puerto indicado y devuelve `code` y `state`.
#[tauri::command]
pub async fn await_oauth_loopback(redirect_uri: String) -> Result<OAuthLoopbackResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let addr = redirect_uri
            .trim_start_matches("http://")
            .split('/')
            .next()
            .ok_or_else(|| "redirect_uri inválido".to_string())?
            .to_string();

        let listener = TcpListener::bind(&addr)
            .map_err(|error| format!("No se pudo escuchar en {addr}: {error}"))?;
        let _ = listener.set_nonblocking(false);

        let (mut stream, _) = listener
            .accept()
            .map_err(|error| format!("Fallo al aceptar callback OAuth: {error}"))?;
        let _ = stream.set_read_timeout(Some(Duration::from_secs(10)));

        let mut buffer = [0_u8; 4096];
        let read = stream.read(&mut buffer).unwrap_or(0);
        let request = String::from_utf8_lossy(&buffer[..read]);
        let first_line = request.lines().next().unwrap_or("");
        let path = first_line.split_whitespace().nth(1).unwrap_or("");
        let query = path.split_once('?').map(|(_, q)| q).unwrap_or("");

        let code = extract_query_param(query, "code");
        let state = extract_query_param(query, "state");
        let error = extract_query_param(query, "error");

        let body = if code.is_some() {
            "<!doctype html><html lang='es'><meta charset='utf-8'><title>Lexomata</title><body style='font-family:system-ui;padding:2rem;text-align:center'><h2>Listo, vuelve a Lexomata</h2><p>Ya puedes cerrar esta pestaña.</p></body></html>"
        } else {
            "<!doctype html><html lang='es'><meta charset='utf-8'><title>Lexomata</title><body style='font-family:system-ui;padding:2rem;text-align:center'><h2>Autorización cancelada</h2><p>Vuelve a Lexomata para intentarlo de nuevo.</p></body></html>"
        };

        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();

        if let Some(err) = error {
            return Err(format!("Google OAuth rechazado: {err}"));
        }

        let code = code.ok_or_else(|| "El callback OAuth no incluyó parámetro code".to_string())?;
        Ok(OAuthLoopbackResult {
            code,
            state,
            redirect_uri,
        })
    })
    .await
    .map_err(|error| format!("Error interno en loopback OAuth: {error}"))?
}
