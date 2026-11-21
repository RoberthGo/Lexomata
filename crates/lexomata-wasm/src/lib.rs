//! Puente delgado entre el motor Rust y la interfaz Web/Nativa.
//!
//! Regla: ninguna función de este crate debe usar `unwrap`, `expect` ni `panic!`
//! en código de producción. Los errores se devuelven como `Result` serializable.

use wasm_bindgen::prelude::*;

/// Devuelve la versión del motor para la comprobación de humo de la Fase 0.
#[wasm_bindgen]
pub fn engine_version() -> String {
    lexomata_core::engine_version().to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wasm_bridge_exposes_engine_version() {
        assert!(!engine_version().is_empty());
    }
}
