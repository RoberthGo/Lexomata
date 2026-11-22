//! Definición formal lista para mostrar o copiar.

use crate::error::EngineError;
use crate::model::{LexoProject, MachineType, TapeMove, TransitionRule};
use crate::validation::validate_machine;
use serde::{Deserialize, Serialize};
use std::fmt::Write;

/// Fila de la tabla de transición formal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormalTransitionRow {
    pub transition_id: String,
    pub from: String,
    pub to: String,
    /// Etiqueta compacta: `0`, `ε` o `0 ; X, R`.
    pub label: String,
    pub read: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub write: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub move_symbol: Option<TapeMove>,
}

/// Definición formal completa de la máquina.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormalDefinition {
    pub machine_type: MachineType,
    pub tuple: String,
    pub state_set: Vec<String>,
    pub alphabet: Vec<String>,
    pub tape_alphabet: Vec<String>,
    pub initial_state: String,
    pub accepting_states: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blank_symbol: Option<String>,
    pub transitions: Vec<FormalTransitionRow>,
    pub text: String,
    pub latex: String,
}

/// Construye la definición formal de un proyecto válido.
pub fn get_formal_definition(project: &LexoProject) -> Result<FormalDefinition, EngineError> {
    let report = validate_machine(project);
    if let Some(error) = report.errors.first() {
        return Err(error.clone());
    }

    let initial = project
        .initial_state()
        .map(|state| state.label.clone())
        .unwrap_or_default();

    let state_set = project.ordered_state_labels();
    let alphabet = project.effective_alphabet();
    let accepting_states = sorted_labels(project, true);
    let tape_alphabet = if project.machine_type.is_turing() {
        project.config.tape_alphabet.clone()
    } else {
        Vec::new()
    };
    let blank_symbol = project
        .machine_type
        .is_turing()
        .then(|| project.config.blank_symbol.clone());

    let mut transitions = build_rows(project);

    transitions.sort_by(|left, right| {
        left.from
            .cmp(&right.from)
            .then_with(|| left.label.cmp(&right.label))
            .then_with(|| left.to.cmp(&right.to))
            .then_with(|| left.transition_id.cmp(&right.transition_id))
    });

    let tuple = match project.machine_type {
        MachineType::Dfa | MachineType::Nfa | MachineType::NfaEpsilon => {
            "M = (Q, Σ, δ, q0, F)".to_owned()
        }
        MachineType::TmSingle | MachineType::TmMulti => "M = (Q, Σ, Γ, δ, q0, B, F)".to_owned(),
    };

    let text = render_text(
        project,
        &tuple,
        &state_set,
        &alphabet,
        &tape_alphabet,
        &initial,
        &accepting_states,
        &transitions,
    );
    let latex = render_latex(
        project,
        &state_set,
        &alphabet,
        &tape_alphabet,
        &initial,
        &accepting_states,
        &transitions,
    );

    Ok(FormalDefinition {
        machine_type: project.machine_type,
        tuple,
        state_set,
        alphabet,
        tape_alphabet,
        initial_state: initial,
        accepting_states,
        blank_symbol,
        transitions,
        text,
        latex,
    })
}

fn sorted_labels(project: &LexoProject, accepting: bool) -> Vec<String> {
    let mut labels: Vec<String> = project
        .states
        .iter()
        .filter(|state| state.is_accepting == accepting)
        .map(|state| state.label.clone())
        .collect();
    labels.sort();
    labels
}

fn build_rows(project: &LexoProject) -> Vec<FormalTransitionRow> {
    let mut rows = Vec::new();

    for transition in &project.transitions {
        let Some(from) = project.state(&transition.from) else {
            continue;
        };
        let Some(to) = project.state(&transition.to) else {
            continue;
        };

        match &transition.rule {
            TransitionRule::Fa { .. } => {
                let symbol = transition
                    .rule
                    .fa_symbol()
                    .map(str::to_owned)
                    .unwrap_or_else(|| {
                        let configured = project.config.epsilon_symbol.clone();
                        if configured.is_empty() {
                            "ε".to_owned()
                        } else {
                            configured
                        }
                    });

                rows.push(FormalTransitionRow {
                    transition_id: transition.id.clone(),
                    from: from.label.clone(),
                    to: to.label.clone(),
                    label: symbol.clone(),
                    read: symbol,
                    write: None,
                    move_symbol: None,
                });
            }
            TransitionRule::Tm { operations } => {
                let label = operations
                    .iter()
                    .map(|operation| {
                        format!(
                            "{} ; {}, {}",
                            operation.read, operation.write, operation.r#move
                        )
                    })
                    .collect::<Vec<_>>()
                    .join(" | ");

                let first = operations.first();

                rows.push(FormalTransitionRow {
                    transition_id: transition.id.clone(),
                    from: from.label.clone(),
                    to: to.label.clone(),
                    label,
                    read: first
                        .map(|operation| operation.read.clone())
                        .unwrap_or_default(),
                    write: first.map(|operation| operation.write.clone()),
                    move_symbol: first.map(|operation| operation.r#move),
                });
            }
        }
    }

    rows
}

#[allow(clippy::too_many_arguments)]
fn render_text(
    project: &LexoProject,
    tuple: &str,
    state_set: &[String],
    alphabet: &[String],
    tape_alphabet: &[String],
    initial: &str,
    accepting: &[String],
    transitions: &[FormalTransitionRow],
) -> String {
    let mut text = String::new();
    let _ = writeln!(text, "{tuple}");
    let _ = writeln!(text, "Q = {{{}}}", state_set.join(", "));
    let _ = writeln!(text, "Σ = {{{}}}", alphabet.join(", "));

    if project.machine_type.is_turing() {
        let _ = writeln!(text, "Γ = {{{}}}", tape_alphabet.join(", "));
        let _ = writeln!(text, "B = {}", project.config.blank_symbol);
    }

    let _ = writeln!(text, "q0 = {initial}");
    let _ = writeln!(text, "F = {{{}}}", accepting.join(", "));
    text.push_str("δ:\n");

    if transitions.is_empty() {
        text.push_str("  (sin transiciones)\n");
    } else {
        for row in transitions {
            match (&row.write, row.move_symbol) {
                (Some(write), Some(movement)) => {
                    let _ = writeln!(
                        text,
                        "  δ({}, {}) = ({}, {}, {movement})",
                        row.from, row.read, row.to, write
                    );
                }
                _ => {
                    let _ = writeln!(text, "  δ({}, {}) = {}", row.from, row.read, row.to);
                }
            }
        }
    }

    text
}

#[allow(clippy::too_many_arguments)]
fn render_latex(
    project: &LexoProject,
    state_set: &[String],
    alphabet: &[String],
    tape_alphabet: &[String],
    initial: &str,
    accepting: &[String],
    transitions: &[FormalTransitionRow],
) -> String {
    let mut latex = String::new();
    latex.push_str("\\begin{aligned}\n");

    if project.machine_type.is_turing() {
        latex.push_str("M &= (Q, \\Sigma, \\Gamma, \\delta, q_0, B, F)\\\\\n");
    } else {
        latex.push_str("M &= (Q, \\Sigma, \\delta, q_0, F)\\\\\n");
    }

    let _ = writeln!(
        latex,
        "Q &= \\{{{}\\}}\\\\",
        state_set
            .iter()
            .map(|label| escape_latex(label))
            .collect::<Vec<_>>()
            .join(", ")
    );
    let _ = writeln!(
        latex,
        "\\Sigma &= \\{{{}\\}}\\\\",
        alphabet
            .iter()
            .map(|symbol| escape_latex(symbol))
            .collect::<Vec<_>>()
            .join(", ")
    );

    if project.machine_type.is_turing() {
        let _ = writeln!(
            latex,
            "\\Gamma &= \\{{{}\\}}\\\\",
            tape_alphabet
                .iter()
                .map(|symbol| escape_latex(symbol))
                .collect::<Vec<_>>()
                .join(", ")
        );
        let _ = writeln!(
            latex,
            "B &= {}\\\\",
            escape_latex(&project.config.blank_symbol)
        );
    }

    let _ = writeln!(latex, "q_0 &= {}\\\\", escape_latex(initial));
    let _ = writeln!(
        latex,
        "F &= \\{{{}\\}}\\\\",
        accepting
            .iter()
            .map(|label| escape_latex(label))
            .collect::<Vec<_>>()
            .join(", ")
    );

    for row in transitions {
        match (&row.write, row.move_symbol) {
            (Some(write), Some(movement)) => {
                let _ = writeln!(
                    latex,
                    "\\delta({}, {}) &= ({}, {}, {movement})\\\\",
                    escape_latex(&row.from),
                    escape_latex(&row.read),
                    escape_latex(&row.to),
                    escape_latex(write)
                );
            }
            _ => {
                let _ = writeln!(
                    latex,
                    "\\delta({}, {}) &= {}\\\\",
                    escape_latex(&row.from),
                    escape_latex(&row.read),
                    escape_latex(&row.to)
                );
            }
        }
    }

    latex.push_str("\\end{aligned}\n");
    latex
}

fn escape_latex(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());

    for character in value.chars() {
        match character {
            '\\' => escaped.push_str("\\textbackslash{}"),
            '_' => escaped.push_str("\\_"),
            '{' => escaped.push_str("\\{"),
            '}' => escaped.push_str("\\}"),
            '&' => escaped.push_str("\\&"),
            '%' => escaped.push_str("\\%"),
            '$' => escaped.push_str("\\$"),
            '#' => escaped.push_str("\\#"),
            '^' => escaped.push_str("\\^{}"),
            '~' => escaped.push_str("\\~{}"),
            other => escaped.push(other),
        }
    }

    escaped
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::examples;

    #[test]
    fn dfa_definition_contains_all_sets() {
        let formal = get_formal_definition(&examples::binary_ending_in_01()).expect("formal");

        assert_eq!(formal.state_set, vec!["q0", "q1", "q2"]);
        assert_eq!(formal.alphabet, vec!["0", "1"]);
        assert_eq!(formal.initial_state, "q0");
        assert_eq!(formal.accepting_states, vec!["q2"]);
        assert_eq!(formal.transitions.len(), 6);
        assert!(formal.text.contains("M = (Q, Σ, δ, q0, F)"));
        assert!(formal.text.contains("δ(q0, 0) = q1"));
        assert!(formal.latex.contains("\\delta(q0, 0) &= q1"));
    }

    #[test]
    fn epsilon_uses_configured_symbol() {
        let formal = get_formal_definition(&examples::epsilon_cycle()).expect("formal");

        assert!(formal
            .transitions
            .iter()
            .any(|row| row.label == "ε" && row.from == "q0" && row.to == "q1"));
        assert!(formal.text.contains("δ(q0, ε) = q1"));
    }

    #[test]
    fn definition_is_deterministic() {
        let first = get_formal_definition(&examples::redundant_dfa()).expect("formal");
        let second = get_formal_definition(&examples::redundant_dfa()).expect("formal");

        assert_eq!(first, second);
    }

    #[test]
    fn invalid_project_is_rejected() {
        let mut project = examples::binary_ending_in_01();
        project.states[0].is_initial = false;

        let error = get_formal_definition(&project).expect_err("debe fallar");

        assert_eq!(error.code, crate::EngineErrorCode::NoInitialState);
    }

    #[test]
    fn latex_escapes_special_characters() {
        assert_eq!(escape_latex("q_0"), "q\\_0");
        assert_eq!(escape_latex("a&b"), "a\\&b");
    }
}
