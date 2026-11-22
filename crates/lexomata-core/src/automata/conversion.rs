//! Conversión AFN / AFN-ε → AFD por construcción de subconjuntos.

use crate::automata::epsilon::epsilon_closure;
use crate::automata::grid_position;
use crate::error::{EngineError, EngineErrorCode};
use crate::model::{
    LexoProject, MachineType, State, Transition, TransitionRule, Viewport, SCHEMA_VERSION,
};
use crate::validation::validate_machine;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, VecDeque};

/// Límite de seguridad para evitar agotar la memoria de WASM.
pub const MAX_DFA_STATES: usize = 256;

/// Resultado de la conversión, con el mapa de subconjuntos originales.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NfaToDfaResult {
    pub dfa: LexoProject,
    /// ID del estado del AFD → IDs de los estados originales que lo forman.
    pub subset_map: BTreeMap<String, Vec<String>>,
}

/// Convierte un AFN o AFN-ε en un AFD sin estado sumidero explícito.
pub fn nfa_to_dfa(project: &LexoProject) -> Result<NfaToDfaResult, EngineError> {
    nfa_to_dfa_with_dead_state(project, false)
}

/// Convierte un AFN o AFN-ε en un AFD.
///
/// Si `include_dead_state` es `true`, se añade un estado sumidero explícito
/// para que la función de transición sea total.
pub fn nfa_to_dfa_with_dead_state(
    project: &LexoProject,
    include_dead_state: bool,
) -> Result<NfaToDfaResult, EngineError> {
    if !matches!(
        project.machine_type,
        MachineType::Nfa | MachineType::NfaEpsilon
    ) {
        return Err(EngineError::new(
            EngineErrorCode::UnsupportedOperation,
            "La conversión a AFD solo aplica a proyectos AFN o AFN-ε.",
        ));
    }

    let report = validate_machine(project);
    if let Some(error) = report.errors.first() {
        return Err(error.clone());
    }

    let initial = project.initial_state().ok_or_else(|| {
        EngineError::new(
            EngineErrorCode::NoInitialState,
            "No hay estado inicial para iniciar la conversión.",
        )
    })?;

    let alphabet = project.effective_alphabet();
    let start: BTreeSet<String> = epsilon_closure_of(project, &initial.id);

    let mut subsets: Vec<BTreeSet<String>> = vec![start.clone()];
    let mut subset_index: BTreeMap<BTreeSet<String>, usize> = BTreeMap::new();
    subset_index.insert(start.clone(), 0);

    let mut queue = VecDeque::new();
    queue.push_back(start);

    while let Some(subset) = queue.pop_front() {
        for symbol in &alphabet {
            let target = move_subset(project, &subset, symbol);

            if target.is_empty() && !include_dead_state {
                continue;
            }

            if !subset_index.contains_key(&target) {
                if subsets.len() >= MAX_DFA_STATES {
                    return Err(EngineError::new(
                        EngineErrorCode::StepLimitExceeded,
                        format!(
                            "La conversión supera el límite de {MAX_DFA_STATES} estados; se abortó para proteger la memoria."
                        ),
                    ));
                }

                let index = subsets.len();
                subset_index.insert(target.clone(), index);
                subsets.push(target.clone());
                queue.push_back(target);
            }
        }
    }

    let state_id = |subset: &BTreeSet<String>| -> String {
        if subset.is_empty() {
            "d-dead".to_owned()
        } else {
            format!("d{}", subset_index.get(subset).copied().unwrap_or(0))
        }
    };

    let mut states = Vec::with_capacity(subsets.len());
    for (index, subset) in subsets.iter().enumerate() {
        let (x, y) = grid_position(index);
        states.push(State {
            id: state_id(subset),
            label: if subset.is_empty() {
                "D∅".to_owned()
            } else {
                format!("D{index}")
            },
            x,
            y,
            is_initial: index == 0,
            is_accepting: subset
                .iter()
                .any(|id| project.state(id).is_some_and(|state| state.is_accepting)),
            comment: Some(format_subset(project, subset)),
        });
    }

    let mut transitions = Vec::new();
    let mut transition_counter = 0usize;

    for subset in &subsets {
        for symbol in &alphabet {
            let target = move_subset(project, subset, symbol);
            let Some(target_index) = subset_index.get(&target) else {
                continue;
            };

            transitions.push(Transition {
                id: format!("dt{transition_counter}"),
                from: state_id(subset),
                to: state_id(&subsets[*target_index]),
                curve_offset: 0.0,
                rule: TransitionRule::Fa {
                    symbol: Some(symbol.clone()),
                },
            });
            transition_counter += 1;
        }
    }

    let mut subset_map = BTreeMap::new();
    for subset in &subsets {
        subset_map.insert(state_id(subset), subset.iter().cloned().collect());
    }

    let mut config = project.config.clone();
    config.alphabet = alphabet;

    let dfa = LexoProject {
        schema_version: SCHEMA_VERSION.to_owned(),
        id: format!("{}-dfa", project.id),
        name: format!("{} — AFD", project.name),
        description: project.description.clone(),
        machine_type: MachineType::Dfa,
        created_at: project.created_at.clone(),
        updated_at: project.updated_at.clone(),
        config,
        states,
        transitions,
        test_cases: project.test_cases.clone(),
        viewport: Viewport::default(),
    };

    Ok(NfaToDfaResult { dfa, subset_map })
}

fn epsilon_closure_of(project: &LexoProject, state_id: &str) -> BTreeSet<String> {
    let mut seeds = BTreeSet::new();
    seeds.insert(state_id.to_owned());
    epsilon_closure(project, &seeds).states
}

fn move_subset(project: &LexoProject, subset: &BTreeSet<String>, symbol: &str) -> BTreeSet<String> {
    let mut raw = BTreeSet::new();

    for state_id in subset {
        for transition in project
            .transitions
            .iter()
            .filter(|transition| transition.from == *state_id)
        {
            if transition.rule.fa_symbol() == Some(symbol)
                && project.state(&transition.to).is_some()
            {
                raw.insert(transition.to.clone());
            }
        }
    }

    if raw.is_empty() {
        raw
    } else {
        epsilon_closure(project, &raw).states
    }
}

fn format_subset(project: &LexoProject, subset: &BTreeSet<String>) -> String {
    if subset.is_empty() {
        return "Sumidero implícito".to_owned();
    }

    let labels: Vec<String> = subset
        .iter()
        .filter_map(|id| project.state(id))
        .map(|state| state.label.clone())
        .collect();

    format!("{{{}}}", labels.join(", "))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::automata::simulate_fa;
    use crate::examples;
    use crate::validation::{validate_machine, WarningCode};

    fn all_strings(alphabet: &[&str], max_len: usize) -> Vec<String> {
        fn extend(
            alphabet: &[&str],
            prefix: &mut String,
            remaining: usize,
            output: &mut Vec<String>,
        ) {
            output.push(prefix.clone());
            if remaining == 0 {
                return;
            }
            for symbol in alphabet {
                let original_len = prefix.len();
                prefix.push_str(symbol);
                extend(alphabet, prefix, remaining - 1, output);
                prefix.truncate(original_len);
            }
        }

        let mut output = Vec::new();
        extend(alphabet, &mut String::new(), max_len, &mut output);
        output
    }

    fn assert_equivalent(source: &LexoProject, converted: &LexoProject, alphabet: &[&str]) {
        for input in all_strings(alphabet, 5) {
            let left = simulate_fa(source, &input, 0).expect("simular origen");
            let right = simulate_fa(converted, &input, 0).expect("simular AFD");
            assert_eq!(
                left.verdict, right.verdict,
                "diferencia para la cadena '{input}'"
            );
        }
    }

    #[test]
    fn converts_nfa_to_valid_deterministic_dfa() {
        let source = examples::branching_nfa();
        let result = nfa_to_dfa(&source).expect("convertir");

        assert_eq!(result.dfa.machine_type, MachineType::Dfa);
        assert_eq!(result.dfa.states.len(), 3);
        assert!(validate_machine(&result.dfa).valid);
        assert_eq!(result.subset_map.len(), result.dfa.states.len());
        assert_eq!(result.subset_map.get("d0"), Some(&vec!["s0".to_owned()]));
    }

    #[test]
    fn converted_dfa_is_equivalent_for_branching_nfa() {
        let source = examples::branching_nfa();
        let result = nfa_to_dfa(&source).expect("convertir");

        assert_equivalent(&source, &result.dfa, &["a", "b"]);
    }

    #[test]
    fn epsilon_cycles_are_resolved_in_conversion() {
        let source = examples::epsilon_cycle();
        let result = nfa_to_dfa(&source).expect("convertir");

        assert_equivalent(&source, &result.dfa, &["a"]);
        assert!(result
            .dfa
            .transitions
            .iter()
            .all(|transition| !transition.rule.is_epsilon()));
    }

    #[test]
    fn conversion_handles_epsilon_on_binary_automaton() {
        let mut source = examples::binary_ending_in_01();
        source.machine_type = MachineType::NfaEpsilon;
        source.transitions.push(Transition {
            id: "t-epsilon".to_owned(),
            from: "s0".to_owned(),
            to: "s1".to_owned(),
            curve_offset: 0.0,
            rule: TransitionRule::Fa { symbol: None },
        });

        let result = nfa_to_dfa(&source).expect("convertir");

        assert_equivalent(&source, &result.dfa, &["0", "1"]);
    }

    #[test]
    fn dead_state_makes_transition_function_total() {
        let mut source = examples::branching_nfa();
        source
            .transitions
            .retain(|transition| transition.id != "t2");

        let result = nfa_to_dfa_with_dead_state(&source, true).expect("convertir");
        let alphabet = result.dfa.effective_alphabet();

        for state in &result.dfa.states {
            for symbol in &alphabet {
                let count = result
                    .dfa
                    .transitions
                    .iter()
                    .filter(|transition| {
                        transition.from == state.id
                            && transition.rule.fa_symbol() == Some(symbol.as_str())
                    })
                    .count();
                assert_eq!(count, 1, "estado {} símbolo {}", state.label, symbol);
            }
        }

        let report = validate_machine(&result.dfa);
        assert!(!report
            .warnings
            .iter()
            .any(|warning| warning.code == WarningCode::IncompleteDfa));
    }

    #[test]
    fn dead_state_is_omitted_by_default() {
        let mut source = examples::branching_nfa();
        source
            .transitions
            .retain(|transition| transition.id != "t2");

        let result = nfa_to_dfa(&source).expect("convertir");

        assert!(!result.dfa.states.iter().any(|state| state.id == "d-dead"));
        assert!(validate_machine(&result.dfa)
            .warnings
            .iter()
            .any(|warning| warning.code == WarningCode::IncompleteDfa));
    }

    #[test]
    fn conversion_is_deterministic() {
        let source = examples::branching_nfa();

        let first = nfa_to_dfa(&source).expect("convertir");
        let second = nfa_to_dfa(&source).expect("convertir");

        assert_eq!(first, second);
    }

    #[test]
    fn dfa_input_is_rejected() {
        let source = examples::binary_ending_in_01();

        let error = nfa_to_dfa(&source).expect_err("no debe convertir un AFD");

        assert_eq!(error.code, EngineErrorCode::UnsupportedOperation);
    }
}
