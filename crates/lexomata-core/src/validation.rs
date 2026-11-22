//! Validación estática de proyectos `.lexo`.
//!
//! Separa errores bloqueantes (impiden simular) de advertencias informativas,
//! tal como exige `specs/04-AUTOMATA-ENGINE-SPEC.md`.

use crate::error::{EngineError, EngineErrorCode};
use crate::model::{LexoProject, MachineType, TransitionRule, SCHEMA_VERSION};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, VecDeque};

/// Códigos estables de advertencia.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WarningCode {
    IncompleteDfa,
    UnreachableStates,
    NoAcceptingStates,
    EpsilonInNfa,
    EmptyAlphabet,
    TransitionFromAcceptingState,
    UndeclaredTapeSymbol,
}

/// Advertencia no bloqueante con IDs relacionados para resaltar en la UI.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationWarning {
    pub code: WarningCode,
    pub message: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub related_ids: Vec<String>,
}

/// Reporte completo de validación.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationReport {
    pub valid: bool,
    pub errors: Vec<EngineError>,
    pub warnings: Vec<ValidationWarning>,
}

impl ValidationReport {
    fn new() -> Self {
        Self {
            valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    fn error(&mut self, error: EngineError) {
        self.valid = false;
        self.errors.push(error);
    }

    fn warning(
        &mut self,
        code: WarningCode,
        message: impl Into<String>,
        mut related_ids: Vec<String>,
    ) {
        related_ids.sort();
        related_ids.dedup();
        self.warnings.push(ValidationWarning {
            code,
            message: message.into(),
            related_ids,
        });
    }
}

/// Valida un proyecto completo y devuelve errores y advertencias.
pub fn validate_machine(project: &LexoProject) -> ValidationReport {
    let mut report = ValidationReport::new();

    validate_schema(project, &mut report);
    validate_initial_state(project, &mut report);
    validate_transitions(project, &mut report);

    if project.machine_type.is_finite_automaton() {
        validate_finite_automaton(project, &mut report);
    } else if project.machine_type.is_turing() {
        validate_turing(project, &mut report);
    }

    report
}

fn validate_schema(project: &LexoProject, report: &mut ValidationReport) {
    if project.schema_version != SCHEMA_VERSION {
        report.error(EngineError::new(
            EngineErrorCode::InvalidSchema,
            format!(
                "Versión de esquema no soportada: '{}' (se esperaba '{}').",
                project.schema_version, SCHEMA_VERSION
            ),
        ));
    }

    let mut seen_states = BTreeSet::new();
    for state in &project.states {
        if state.id.is_empty() {
            report.error(EngineError::new(
                EngineErrorCode::InvalidSchema,
                "Hay un estado sin identificador.",
            ));
        } else if !seen_states.insert(state.id.as_str()) {
            report.error(EngineError::with_related_ids(
                EngineErrorCode::InvalidSchema,
                format!("Identificador de estado duplicado: '{}'.", state.id),
                vec![state.id.clone()],
            ));
        }
    }

    let mut seen_transitions = BTreeSet::new();
    for transition in &project.transitions {
        if transition.id.is_empty() {
            report.error(EngineError::new(
                EngineErrorCode::InvalidSchema,
                "Hay una transición sin identificador.",
            ));
        } else if !seen_transitions.insert(transition.id.as_str()) {
            report.error(EngineError::with_related_ids(
                EngineErrorCode::InvalidSchema,
                format!(
                    "Identificador de transición duplicado: '{}'.",
                    transition.id
                ),
                vec![transition.id.clone()],
            ));
        }
    }

    if project.machine_type.is_turing() {
        if project.config.tape_count == 0 {
            report.error(EngineError::new(
                EngineErrorCode::InvalidSchema,
                "Una máquina de Turing debe tener al menos una cinta.",
            ));
        }
        if project.config.blank_symbol.is_empty() {
            report.error(EngineError::new(
                EngineErrorCode::InvalidSchema,
                "El símbolo blanco no puede estar vacío.",
            ));
        }
    }
}

fn validate_initial_state(project: &LexoProject, report: &mut ValidationReport) {
    let initial_ids: Vec<String> = project
        .states
        .iter()
        .filter(|state| state.is_initial)
        .map(|state| state.id.clone())
        .collect();

    match initial_ids.len() {
        0 => report.error(EngineError::new(
            EngineErrorCode::NoInitialState,
            "No hay ningún estado marcado como inicial.",
        )),
        1 => {}
        _ => report.error(EngineError::with_related_ids(
            EngineErrorCode::MultipleInitialStates,
            format!(
                "Hay {} estados marcados como iniciales; debe existir exactamente uno.",
                initial_ids.len()
            ),
            initial_ids,
        )),
    }
}

fn validate_transitions(project: &LexoProject, report: &mut ValidationReport) {
    for transition in &project.transitions {
        let mut related = vec![transition.id.clone()];
        let from_exists = project.state(&transition.from).is_some();
        let to_exists = project.state(&transition.to).is_some();

        if !from_exists {
            related.push(transition.from.clone());
        }
        if !to_exists {
            related.push(transition.to.clone());
        }
        if !from_exists || !to_exists {
            report.error(EngineError::with_related_ids(
                EngineErrorCode::InvalidTransitionRule,
                format!(
                    "La transición '{}' apunta a un estado inexistente.",
                    transition.id
                ),
                related,
            ));
            continue;
        }

        match (project.machine_type.is_finite_automaton(), &transition.rule) {
            (true, TransitionRule::Tm { .. }) => report.error(EngineError::with_related_ids(
                EngineErrorCode::InvalidTransitionRule,
                format!(
                    "La transición '{}' es de máquina de Turing, pero el proyecto es un autómata finito.",
                    transition.id
                ),
                vec![transition.id.clone()],
            )),
            (false, TransitionRule::Fa { .. }) if project.machine_type.is_turing() => {
                report.error(EngineError::with_related_ids(
                    EngineErrorCode::InvalidTransitionRule,
                    format!(
                        "La transición '{}' es de autómata finito, pero el proyecto es una máquina de Turing.",
                        transition.id
                    ),
                    vec![transition.id.clone()],
                ));
            }
            _ => {}
        }

        if let Some(symbol) = transition.rule.fa_symbol() {
            if symbol.chars().count() != 1 {
                report.error(EngineError::with_related_ids(
                    EngineErrorCode::InvalidTransitionRule,
                    format!(
                        "La transición '{}' usa el símbolo '{}'; debe ser exactamente un carácter (o ε).",
                        transition.id, symbol
                    ),
                    vec![transition.id.clone()],
                ));
            }
        }
    }
}

fn validate_finite_automaton(project: &LexoProject, report: &mut ValidationReport) {
    if project.machine_type == MachineType::Dfa {
        validate_dfa_determinism(project, report);
    }

    let alphabet = project.effective_alphabet();

    if alphabet.is_empty() {
        report.warning(
            WarningCode::EmptyAlphabet,
            "El alfabeto está vacío; solo se podrán aceptar cadenas vacías mediante ε.",
            Vec::new(),
        );
    }

    if !project.states.iter().any(|state| state.is_accepting) {
        report.warning(
            WarningCode::NoAcceptingStates,
            "No hay estados de aceptación: el lenguaje aceptado es vacío.",
            Vec::new(),
        );
    }

    if let Some(initial) = project.initial_state() {
        let reachable = reachable_states(project, &initial.id);
        let unreachable: Vec<String> = project
            .states
            .iter()
            .filter(|state| !reachable.contains(&state.id))
            .map(|state| state.id.clone())
            .collect();

        if !unreachable.is_empty() {
            report.warning(
                WarningCode::UnreachableStates,
                format!(
                    "{} estado(s) no son alcanzables desde el estado inicial.",
                    unreachable.len()
                ),
                unreachable,
            );
        }

        if project.machine_type == MachineType::Dfa {
            let missing = missing_dfa_transitions(project, &alphabet);
            if !missing.is_empty() {
                let states: Vec<String> = missing.keys().cloned().collect();
                let pairs: usize = missing.values().map(Vec::len).sum();
                report.warning(
                    WarningCode::IncompleteDfa,
                    format!(
                        "El AFD está incompleto: {pairs} par(es) (estado, símbolo) sin transición. Las cadenas que lleguen a un par indefinido se rechazan."
                    ),
                    states,
                );
            }
        }
    }
}

fn validate_turing(project: &LexoProject, report: &mut ValidationReport) {
    if project.machine_type == MachineType::TmSingle && project.config.tape_count != 1 {
        report.error(EngineError::new(
            EngineErrorCode::InvalidSchema,
            format!(
                "Una MT_SINGLE debe tener exactamente una cinta; config.tapeCount es {}.",
                project.config.tape_count
            ),
        ));
    }

    if project.config.blank_symbol.chars().count() != 1 {
        report.error(EngineError::new(
            EngineErrorCode::InvalidSchema,
            "El símbolo blanco de una máquina de Turing debe ser exactamente un carácter.",
        ));
    }

    let expected_operations = project.config.tape_count.max(1) as usize;
    let tape_alphabet: BTreeSet<&str> = project
        .config
        .tape_alphabet
        .iter()
        .map(String::as_str)
        .collect();

    let mut seen: BTreeMap<(&str, Vec<String>), &str> = BTreeMap::new();
    let mut undeclared_symbols = BTreeSet::new();
    let mut undeclared_transitions = BTreeSet::new();

    for transition in &project.transitions {
        let TransitionRule::Tm { operations } = &transition.rule else {
            continue;
        };

        if operations.len() != expected_operations {
            report.error(EngineError::with_related_ids(
                EngineErrorCode::InvalidTransitionRule,
                format!(
                    "La transición '{}' tiene {} operación(es), pero la máquina declara {} cinta(s).",
                    transition.id,
                    operations.len(),
                    expected_operations
                ),
                vec![transition.id.clone()],
            ));
        }

        for operation in operations {
            if operation.read.is_empty() || operation.write.is_empty() {
                report.error(EngineError::with_related_ids(
                    EngineErrorCode::InvalidTransitionRule,
                    format!(
                        "La transición '{}' tiene un símbolo de lectura o escritura vacío; usa '{}' para el blanco.",
                        transition.id, project.config.blank_symbol
                    ),
                    vec![transition.id.clone()],
                ));
            } else if operation.read.chars().count() != 1 || operation.write.chars().count() != 1 {
                report.error(EngineError::with_related_ids(
                    EngineErrorCode::InvalidTransitionRule,
                    format!(
                        "La transición '{}' usa símbolos de cinta que no son de un solo carácter.",
                        transition.id
                    ),
                    vec![transition.id.clone()],
                ));
            }

            for symbol in [&operation.read, &operation.write] {
                if !symbol.is_empty()
                    && symbol != &project.config.blank_symbol
                    && !tape_alphabet.contains(symbol.as_str())
                {
                    undeclared_symbols.insert(symbol.clone());
                    undeclared_transitions.insert(transition.id.clone());
                }
            }
        }

        if project
            .state(&transition.from)
            .is_some_and(|state| state.is_accepting)
        {
            report.warning(
                WarningCode::TransitionFromAcceptingState,
                format!(
                    "La transición '{}' sale de un estado de aceptación; la máquina se detendrá al entrar en él y esa transición nunca se usará.",
                    transition.id
                ),
                vec![transition.from.clone(), transition.id.clone()],
            );
        }

        let reads: Vec<String> = operations
            .iter()
            .map(|operation| operation.read.clone())
            .collect();

        if let Some(previous) =
            seen.insert((transition.from.as_str(), reads), transition.id.as_str())
        {
            report.error(EngineError::with_related_ids(
                EngineErrorCode::NonDeterministicConflict,
                format!(
                    "La MT tiene dos transiciones desde '{}' que leen la misma tupla ('{}' y '{}').",
                    transition.from, previous, transition.id
                ),
                vec![previous.to_owned(), transition.id.clone()],
            ));
        }
    }

    if !undeclared_symbols.is_empty() {
        let symbols: Vec<String> = undeclared_symbols.into_iter().collect();
        report.warning(
            WarningCode::UndeclaredTapeSymbol,
            format!(
                "Hay símbolos usados que no están en tapeAlphabet: {}.",
                symbols.join(", ")
            ),
            undeclared_transitions.into_iter().collect(),
        );
    }

    if !project.states.iter().any(|state| state.is_accepting) {
        report.warning(
            WarningCode::NoAcceptingStates,
            "No hay estados de aceptación: la máquina siempre rechazará al detenerse.",
            Vec::new(),
        );
    }

    if let Some(initial) = project.initial_state() {
        let reachable = reachable_states(project, &initial.id);
        let unreachable: Vec<String> = project
            .states
            .iter()
            .filter(|state| !reachable.contains(&state.id))
            .map(|state| state.id.clone())
            .collect();

        if !unreachable.is_empty() {
            report.warning(
                WarningCode::UnreachableStates,
                format!(
                    "{} estado(s) no son alcanzables desde el estado inicial.",
                    unreachable.len()
                ),
                unreachable,
            );
        }
    }
}

fn validate_dfa_determinism(project: &LexoProject, report: &mut ValidationReport) {
    let mut seen: BTreeMap<(&str, &str), &str> = BTreeMap::new();

    for transition in &project.transitions {
        let TransitionRule::Fa { .. } = &transition.rule else {
            continue;
        };

        let Some(symbol) = transition.rule.fa_symbol() else {
            report.error(EngineError::with_related_ids(
                EngineErrorCode::NonDeterministicConflict,
                format!(
                    "El AFD contiene una transición ε en '{}'; usa AFN para transiciones vacías.",
                    transition.id
                ),
                vec![transition.id.clone()],
            ));
            continue;
        };

        if let Some(previous) =
            seen.insert((transition.from.as_str(), symbol), transition.id.as_str())
        {
            report.error(EngineError::with_related_ids(
                EngineErrorCode::NonDeterministicConflict,
                format!(
                    "El AFD tiene dos transiciones para el estado '{}' y el símbolo '{}' ('{}' y '{}').",
                    transition.from, symbol, previous, transition.id
                ),
                vec![previous.to_owned(), transition.id.clone()],
            ));
        }
    }
}

/// Estados alcanzables desde `initial_id` siguiendo cualquier transición.
pub fn reachable_states(project: &LexoProject, initial_id: &str) -> BTreeSet<String> {
    let mut reachable = BTreeSet::new();
    let mut queue = VecDeque::new();

    if project.state(initial_id).is_none() {
        return reachable;
    }

    reachable.insert(initial_id.to_owned());
    queue.push_back(initial_id.to_owned());

    while let Some(current) = queue.pop_front() {
        for transition in project
            .transitions
            .iter()
            .filter(|transition| transition.from == current)
        {
            if project.state(&transition.to).is_some() && reachable.insert(transition.to.clone()) {
                queue.push_back(transition.to.clone());
            }
        }
    }

    reachable
}

/// Pares `(estado, símbolo)` sin transición en un AFD, agrupados por estado.
pub fn missing_dfa_transitions(
    project: &LexoProject,
    alphabet: &[String],
) -> BTreeMap<String, Vec<String>> {
    let mut missing = BTreeMap::new();

    for state in &project.states {
        for symbol in alphabet {
            let defined = project.transitions.iter().any(|transition| {
                transition.from == state.id && transition.rule.fa_symbol() == Some(symbol.as_str())
            });

            if !defined {
                missing
                    .entry(state.id.clone())
                    .or_insert_with(Vec::new)
                    .push(symbol.clone());
            }
        }
    }

    missing
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::examples;
    use crate::model::TransitionRule;

    fn error_codes(report: &ValidationReport) -> Vec<EngineErrorCode> {
        report.errors.iter().map(|error| error.code).collect()
    }

    #[test]
    fn valid_complete_dfa_has_no_findings() {
        let report = validate_machine(&examples::binary_ending_in_01());

        assert!(report.valid);
        assert!(report.errors.is_empty());
        assert!(report.warnings.is_empty(), "{:?}", report.warnings);
    }

    #[test]
    fn missing_initial_state_is_blocking() {
        let mut project = examples::binary_ending_in_01();
        project.states[0].is_initial = false;

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert_eq!(error_codes(&report), vec![EngineErrorCode::NoInitialState]);
    }

    #[test]
    fn multiple_initial_states_are_blocking() {
        let mut project = examples::binary_ending_in_01();
        project.states[2].is_initial = true;

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert_eq!(
            error_codes(&report),
            vec![EngineErrorCode::MultipleInitialStates]
        );
        assert_eq!(
            report.errors[0].related_ids.as_deref(),
            Some(&["s0".to_owned(), "s2".to_owned()][..])
        );
    }

    #[test]
    fn dfa_with_epsilon_is_rejected() {
        let mut project = examples::binary_ending_in_01();
        project.transitions.push(crate::model::Transition {
            id: "t-epsilon".to_owned(),
            from: "s0".to_owned(),
            to: "s1".to_owned(),
            curve_offset: 0.0,
            rule: TransitionRule::Fa { symbol: None },
        });

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert_eq!(
            error_codes(&report),
            vec![EngineErrorCode::NonDeterministicConflict]
        );
    }

    #[test]
    fn dfa_with_duplicate_symbol_is_rejected() {
        let mut project = examples::binary_ending_in_01();
        project.transitions.push(crate::model::Transition {
            id: "t-duplicate".to_owned(),
            from: "s0".to_owned(),
            to: "s2".to_owned(),
            curve_offset: 0.0,
            rule: TransitionRule::Fa {
                symbol: Some("0".to_owned()),
            },
        });

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert_eq!(
            error_codes(&report),
            vec![EngineErrorCode::NonDeterministicConflict]
        );
    }

    #[test]
    fn incomplete_dfa_is_a_warning() {
        let mut project = examples::binary_ending_in_01();
        project
            .transitions
            .retain(|transition| transition.id != "t3");

        let report = validate_machine(&project);

        assert!(report.valid);
        assert!(report
            .warnings
            .iter()
            .any(|warning| warning.code == WarningCode::IncompleteDfa));
    }

    #[test]
    fn unreachable_states_are_reported() {
        let mut project = examples::binary_ending_in_01();
        project.states.push(crate::model::State {
            id: "s9".to_owned(),
            label: "q9".to_owned(),
            x: 0.0,
            y: 0.0,
            is_initial: false,
            is_accepting: false,
            comment: None,
        });

        let report = validate_machine(&project);

        let warning = report
            .warnings
            .iter()
            .find(|warning| warning.code == WarningCode::UnreachableStates)
            .expect("advertencia de inalcanzables");
        assert_eq!(warning.related_ids, vec!["s9".to_owned()]);
    }

    #[test]
    fn transition_to_missing_state_is_blocking() {
        let mut project = examples::binary_ending_in_01();
        project.transitions[0].to = "fantasma".to_owned();

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert!(error_codes(&report).contains(&EngineErrorCode::InvalidTransitionRule));
    }

    #[test]
    fn multi_character_symbol_is_rejected() {
        let mut project = examples::binary_ending_in_01();
        project.transitions[0].rule = TransitionRule::Fa {
            symbol: Some("ab".to_owned()),
        };

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert!(error_codes(&report).contains(&EngineErrorCode::InvalidTransitionRule));
    }

    #[test]
    fn epsilon_in_nfa_mode_is_valid_without_warning() {
        let mut project = examples::epsilon_cycle();
        project.machine_type = MachineType::Nfa;

        let report = validate_machine(&project);

        assert!(report.valid);
        assert!(!report
            .warnings
            .iter()
            .any(|warning| warning.code == WarningCode::EpsilonInNfa));
    }

    #[test]
    fn fa_rule_in_tm_project_is_blocking() {
        let mut project = examples::binary_ending_in_01();
        project.machine_type = MachineType::TmSingle;

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert!(error_codes(&report).contains(&EngineErrorCode::InvalidTransitionRule));
    }

    #[test]
    fn tm_examples_have_no_blocking_errors() {
        for project in [
            examples::binary_increment_tm(),
            examples::equal_zeros_ones_tm(),
            examples::negative_tape_tm(),
            examples::infinite_loop_tm(),
        ] {
            let report = validate_machine(&project);
            assert!(report.valid, "{}: {:?}", project.name, report.errors);
        }
    }

    #[test]
    fn tm_duplicate_read_is_nondeterministic() {
        let mut project = examples::binary_increment_tm();
        project.transitions.push(crate::model::Transition {
            id: "t-dup".to_owned(),
            from: "s0".to_owned(),
            to: "s2".to_owned(),
            curve_offset: 0.0,
            rule: TransitionRule::Tm {
                operations: vec![crate::model::TmOperation {
                    read: "0".to_owned(),
                    write: "0".to_owned(),
                    r#move: crate::model::TapeMove::R,
                }],
            },
        });

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert!(error_codes(&report).contains(&EngineErrorCode::NonDeterministicConflict));
    }

    #[test]
    fn tm_operation_count_must_match_tape_count() {
        let mut project = examples::binary_increment_tm();
        if let TransitionRule::Tm { operations } = &mut project.transitions[0].rule {
            operations.clear();
        }

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert!(error_codes(&report).contains(&EngineErrorCode::InvalidTransitionRule));
    }

    #[test]
    fn tm_undeclared_symbol_is_a_warning() {
        let mut project = examples::binary_increment_tm();
        project.transitions.push(crate::model::Transition {
            id: "t-undeclared".to_owned(),
            from: "s0".to_owned(),
            to: "s2".to_owned(),
            curve_offset: 0.0,
            rule: TransitionRule::Tm {
                operations: vec![crate::model::TmOperation {
                    read: "Z".to_owned(),
                    write: "Z".to_owned(),
                    r#move: crate::model::TapeMove::S,
                }],
            },
        });

        let report = validate_machine(&project);

        assert!(report.valid);
        assert!(report
            .warnings
            .iter()
            .any(|warning| warning.code == WarningCode::UndeclaredTapeSymbol));
    }

    #[test]
    fn tm_transition_from_accepting_state_warns() {
        let mut project = examples::binary_increment_tm();
        project.transitions.push(crate::model::Transition {
            id: "t-from-accept".to_owned(),
            from: "s2".to_owned(),
            to: "s0".to_owned(),
            curve_offset: 0.0,
            rule: TransitionRule::Tm {
                operations: vec![crate::model::TmOperation {
                    read: "0".to_owned(),
                    write: "0".to_owned(),
                    r#move: crate::model::TapeMove::S,
                }],
            },
        });

        let report = validate_machine(&project);

        assert!(report.valid);
        assert!(report
            .warnings
            .iter()
            .any(|warning| warning.code == WarningCode::TransitionFromAcceptingState));
    }

    #[test]
    fn tm_blank_symbol_must_be_one_character() {
        let mut project = examples::binary_increment_tm();
        project.config.blank_symbol = "##".to_owned();

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert!(error_codes(&report).contains(&EngineErrorCode::InvalidSchema));
    }

    #[test]
    fn tm_single_requires_exactly_one_tape() {
        let mut project = examples::binary_increment_tm();
        project.config.tape_count = 2;

        let report = validate_machine(&project);

        assert!(!report.valid);
        assert!(error_codes(&report).contains(&EngineErrorCode::InvalidSchema));
    }
}
