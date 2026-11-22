//! Modelo de datos del archivo `.lexo` (schema v1).
//!
//! Todos los tipos usan `camelCase` en JSON para coincidir exactamente con el
//! contrato documentado en `specs/03-DATA-SCHEMA-AND-WASM-CONTRACT.md`.

use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

/// Versión de esquema que este motor sabe leer y escribir.
pub const SCHEMA_VERSION: &str = "1.0.0";

/// Tipo de máquina del proyecto.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MachineType {
    Dfa,
    Nfa,
    NfaEpsilon,
    TmSingle,
    TmMulti,
}

impl MachineType {
    /// `true` para AFD, AFN y AFN-ε.
    pub fn is_finite_automaton(self) -> bool {
        matches!(self, Self::Dfa | Self::Nfa | Self::NfaEpsilon)
    }

    /// `true` para máquinas de Turing.
    pub fn is_turing(self) -> bool {
        matches!(self, Self::TmSingle | Self::TmMulti)
    }
}

/// Estado del autómata o de la máquina de Turing.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub id: String,
    pub label: String,
    pub x: f64,
    pub y: f64,
    #[serde(default)]
    pub is_initial: bool,
    #[serde(default)]
    pub is_accepting: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
}

/// Movimiento del cabezal de una máquina de Turing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum TapeMove {
    L,
    R,
    S,
}

impl std::fmt::Display for TapeMove {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::L => "L",
            Self::R => "R",
            Self::S => "S",
        })
    }
}

/// Operación de una cinta en una transición de máquina de Turing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmOperation {
    pub read: String,
    pub write: String,
    #[serde(rename = "move")]
    pub r#move: TapeMove,
}

/// Regla de transición, discriminada por `kind`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum TransitionRule {
    /// Regla de autómata finito. `symbol: None` (o `null`) representa ε.
    #[serde(rename = "FA")]
    Fa {
        #[serde(default)]
        symbol: Option<String>,
    },
    /// Regla de máquina de Turing con una operación por cinta.
    #[serde(rename = "TM")]
    Tm { operations: Vec<TmOperation> },
}

impl TransitionRule {
    /// Símbolo de una regla FA; `None` significa ε.
    pub fn fa_symbol(&self) -> Option<&str> {
        match self {
            Self::Fa { symbol } => symbol.as_deref().filter(|symbol| !symbol.is_empty()),
            Self::Tm { .. } => None,
        }
    }

    /// `true` si la regla es una transición vacía de autómata finito.
    pub fn is_epsilon(&self) -> bool {
        matches!(self, Self::Fa { .. }) && self.fa_symbol().is_none()
    }
}

/// Transición entre dos estados.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transition {
    pub id: String,
    pub from: String,
    pub to: String,
    #[serde(default)]
    pub curve_offset: f64,
    pub rule: TransitionRule,
}

/// Configuración global de la máquina.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MachineConfig {
    #[serde(default)]
    pub alphabet: Vec<String>,
    #[serde(default)]
    pub tape_alphabet: Vec<String>,
    #[serde(default = "default_blank_symbol")]
    pub blank_symbol: String,
    #[serde(default = "default_epsilon_symbol")]
    pub epsilon_symbol: String,
    #[serde(default = "default_tape_count")]
    pub tape_count: u8,
    #[serde(default = "default_max_steps")]
    pub default_max_steps: u32,
}

fn default_blank_symbol() -> String {
    "□".to_owned()
}

fn default_epsilon_symbol() -> String {
    "ε".to_owned()
}

fn default_tape_count() -> u8 {
    1
}

fn default_max_steps() -> u32 {
    10_000
}

impl Default for MachineConfig {
    fn default() -> Self {
        Self {
            alphabet: Vec::new(),
            tape_alphabet: Vec::new(),
            blank_symbol: default_blank_symbol(),
            epsilon_symbol: default_epsilon_symbol(),
            tape_count: default_tape_count(),
            default_max_steps: default_max_steps(),
        }
    }
}

/// Resultado esperado de un caso de prueba por lotes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ExpectedVerdict {
    Accept,
    Reject,
}

/// Caso de prueba del panel de lotes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestCase {
    pub id: String,
    pub input: String,
    pub expected: ExpectedVerdict,
}

/// Transformación de vista del lienzo.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Viewport {
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default = "default_zoom")]
    pub zoom: f64,
}

fn default_zoom() -> f64 {
    1.0
}

impl Default for Viewport {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            zoom: 1.0,
        }
    }
}

/// Proyecto completo `.lexo`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LexoProject {
    pub schema_version: String,
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub machine_type: MachineType,
    pub created_at: String,
    pub updated_at: String,
    pub config: MachineConfig,
    pub states: Vec<State>,
    pub transitions: Vec<Transition>,
    #[serde(default)]
    pub test_cases: Vec<TestCase>,
    #[serde(default)]
    pub viewport: Viewport,
}

impl LexoProject {
    /// Busca un estado por su identificador.
    pub fn state(&self, id: &str) -> Option<&State> {
        self.states.iter().find(|state| state.id == id)
    }

    /// Estado inicial, si existe exactamente uno.
    pub fn initial_state(&self) -> Option<&State> {
        let mut initial = self.states.iter().filter(|state| state.is_initial);
        let first = initial.next()?;
        if initial.next().is_some() {
            None
        } else {
            Some(first)
        }
    }

    /// Alfabeto efectivo de entrada, ordenado y sin duplicados.
    ///
    /// Para autómatas finitos se infiere de las reglas no vacías y se une con
    /// `config.alphabet`; para máquinas de Turing se usa la configuración.
    pub fn effective_alphabet(&self) -> Vec<String> {
        let mut symbols = BTreeSet::new();

        for symbol in &self.config.alphabet {
            if !symbol.is_empty() {
                symbols.insert(symbol.clone());
            }
        }

        if self.machine_type.is_finite_automaton() {
            for transition in &self.transitions {
                if let Some(symbol) = transition.rule.fa_symbol() {
                    if !symbol.is_empty() {
                        symbols.insert(symbol.to_owned());
                    }
                }
            }
        }

        symbols.into_iter().collect()
    }

    /// Etiquetas de estados ordenadas por etiqueta y luego por id.
    pub fn ordered_state_labels(&self) -> Vec<String> {
        let mut states: Vec<&State> = self.states.iter().collect();
        states.sort_by(|left, right| {
            left.label
                .cmp(&right.label)
                .then_with(|| left.id.cmp(&right.id))
        });
        states
            .into_iter()
            .map(|state| state.label.clone())
            .collect()
    }

    /// IDs de estados ordenados para trazas deterministas.
    pub fn ordered_state_ids(&self) -> Vec<String> {
        let mut states: Vec<&State> = self.states.iter().collect();
        states.sort_by(|left, right| {
            left.label
                .cmp(&right.label)
                .then_with(|| left.id.cmp(&right.id))
        });
        states.into_iter().map(|state| state.id.clone()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fa_epsilon_serializes_as_null_symbol() {
        let rule = TransitionRule::Fa { symbol: None };
        let json = serde_json::to_string(&rule).expect("serializar regla");

        assert_eq!(json, r#"{"kind":"FA","symbol":null}"#);
        assert!(rule.is_epsilon());
    }

    #[test]
    fn empty_fa_symbol_is_treated_as_epsilon() {
        let rule: TransitionRule =
            serde_json::from_str(r#"{"kind":"FA","symbol":""}"#).expect("deserializar regla");

        assert!(rule.is_epsilon());
    }

    #[test]
    fn tm_rule_roundtrips() {
        let rule = TransitionRule::Tm {
            operations: vec![TmOperation {
                read: "0".to_owned(),
                write: "X".to_owned(),
                r#move: TapeMove::R,
            }],
        };

        let json = serde_json::to_string(&rule).expect("serializar regla");
        let parsed: TransitionRule = serde_json::from_str(&json).expect("deserializar regla");

        assert_eq!(parsed, rule);
        assert!(json.contains(r#""move":"R""#));
    }

    #[test]
    fn effective_alphabet_unions_config_and_rules() {
        let project = crate::examples::binary_ending_in_01();
        let alphabet = project.effective_alphabet();

        assert_eq!(alphabet, vec!["0".to_owned(), "1".to_owned()]);
    }

    #[test]
    fn initial_state_requires_exactly_one() {
        let mut project = crate::examples::binary_ending_in_01();
        project.states[1].is_initial = true;

        assert!(project.initial_state().is_none());
    }
}
