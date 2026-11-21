//! Motor formal de Lexomata.
//!
//! Este crate es Rust puro: no conoce la UI, el DOM, WASM ni la red.
//! Toda la lógica de autómatas finitos y máquinas de Turing vive aquí.

pub mod error;
pub mod examples;
pub mod model;

pub use error::{EngineError, EngineErrorCode};
pub use model::{LexoProject, MachineType, SCHEMA_VERSION};

/// Versión del motor, tomada del manifiesto del crate.
pub const ENGINE_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Devuelve la versión actual del motor.
pub fn engine_version() -> &'static str {
    ENGINE_VERSION
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_version_is_not_empty() {
        assert!(!engine_version().is_empty());
    }
}
