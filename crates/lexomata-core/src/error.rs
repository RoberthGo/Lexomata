use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Códigos de error estables del contrato motor ↔ interfaz.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EngineErrorCode {
    InvalidSchema,
    NoInitialState,
    MultipleInitialStates,
    NonDeterministicConflict,
    InvalidTransitionRule,
    UnsupportedOperation,
    StepLimitExceeded,
    #[serde(rename = "JFLAP_PARSE_ERROR")]
    JflapParseError,
    InternalError,
}

impl std::fmt::Display for EngineErrorCode {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let code = match self {
            Self::InvalidSchema => "INVALID_SCHEMA",
            Self::NoInitialState => "NO_INITIAL_STATE",
            Self::MultipleInitialStates => "MULTIPLE_INITIAL_STATES",
            Self::NonDeterministicConflict => "NON_DETERMINISTIC_CONFLICT",
            Self::InvalidTransitionRule => "INVALID_TRANSITION_RULE",
            Self::UnsupportedOperation => "UNSUPPORTED_OPERATION",
            Self::StepLimitExceeded => "STEP_LIMIT_EXCEEDED",
            Self::JflapParseError => "JFLAP_PARSE_ERROR",
            Self::InternalError => "INTERNAL_ERROR",
        };
        formatter.write_str(code)
    }
}

/// Error tipado y serializable del motor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Error)]
#[serde(rename_all = "camelCase")]
#[error("{code}: {message}")]
pub struct EngineError {
    pub code: EngineErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub related_ids: Option<Vec<String>>,
}

impl EngineError {
    /// Crea un error sin IDs relacionados.
    pub fn new(code: EngineErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            related_ids: None,
        }
    }

    /// Crea un error con IDs de estados o transiciones involucradas.
    pub fn with_related_ids(
        code: EngineErrorCode,
        message: impl Into<String>,
        related_ids: Vec<String>,
    ) -> Self {
        Self {
            code,
            message: message.into(),
            related_ids: Some(related_ids),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_serializes_with_expected_code() {
        let error = EngineError::new(EngineErrorCode::NoInitialState, "falta el estado inicial");
        let json = serde_json::to_string(&error).expect("serializar error");

        assert!(json.contains("NO_INITIAL_STATE"));
        assert!(json.contains("falta el estado inicial"));
    }

    #[test]
    fn jflap_code_is_stable() {
        let error = EngineError::new(EngineErrorCode::JflapParseError, "xml inválido");
        let json = serde_json::to_string(&error).expect("serializar error");

        assert!(json.contains("JFLAP_PARSE_ERROR"));
    }
}
