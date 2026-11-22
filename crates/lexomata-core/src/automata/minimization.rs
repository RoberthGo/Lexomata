//! Minimización de AFD por refinamiento de particiones (Moore/Hopcroft).

use crate::automata::grid_position;
use crate::error::{EngineError, EngineErrorCode};
use crate::model::{
    LexoProject, MachineType, State, Transition, TransitionRule, Viewport, SCHEMA_VERSION,
};
use crate::validation::{reachable_states, validate_machine};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

/// Sentinel interno para el sumidero virtual de la completación temporal.
const VIRTUAL_DEAD: &str = "\u{0}lexomata-dead";

/// Resultado de la minimización.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinimizeResult {
    pub minimized: LexoProject,
    /// Clases de equivalencia con los IDs originales que se fusionaron.
    pub equivalence_classes: Vec<Vec<String>>,
    /// Estados eliminados por ser inalcanzables.
    pub removed_unreachable: Vec<String>,
}

/// Minimiza un AFD válido.
pub fn minimize_dfa(project: &LexoProject) -> Result<MinimizeResult, EngineError> {
    if project.machine_type != MachineType::Dfa {
        return Err(EngineError::new(
            EngineErrorCode::UnsupportedOperation,
            "La minimización solo aplica a proyectos AFD.",
        ));
    }

    let report = validate_machine(project);
    if let Some(error) = report.errors.first() {
        return Err(error.clone());
    }

    let initial = project.initial_state().ok_or_else(|| {
        EngineError::new(
            EngineErrorCode::NoInitialState,
            "No hay estado inicial para minimizar.",
        )
    })?;

    let alphabet = project.effective_alphabet();
    let reachable = reachable_states(project, &initial.id);

    let removed_unreachable: Vec<String> = project
        .states
        .iter()
        .filter(|state| !reachable.contains(&state.id))
        .map(|state| state.id.clone())
        .collect();

    let work_states: Vec<String> = project
        .ordered_state_ids()
        .into_iter()
        .filter(|id| reachable.contains(id))
        .collect();

    let transitions: BTreeMap<(String, String), String> = project
        .transitions
        .iter()
        .filter_map(|transition| {
            transition.rule.fa_symbol().map(|symbol| {
                (
                    (transition.from.clone(), symbol.to_owned()),
                    transition.to.clone(),
                )
            })
        })
        .collect();

    let target = |state_id: &str, symbol: &str| -> String {
        if state_id == VIRTUAL_DEAD {
            return VIRTUAL_DEAD.to_owned();
        }

        transitions
            .get(&(state_id.to_owned(), symbol.to_owned()))
            .cloned()
            .unwrap_or_else(|| VIRTUAL_DEAD.to_owned())
    };

    let is_accepting = |state_id: &str| -> bool {
        state_id != VIRTUAL_DEAD
            && project
                .state(state_id)
                .is_some_and(|state| state.is_accepting)
    };

    let mut all_states = work_states.clone();
    all_states.push(VIRTUAL_DEAD.to_owned());

    let mut groups: Vec<Vec<String>> = vec![
        all_states
            .iter()
            .filter(|state| !is_accepting(state))
            .cloned()
            .collect(),
        all_states
            .iter()
            .filter(|state| is_accepting(state))
            .cloned()
            .collect(),
    ];
    groups.retain(|group| !group.is_empty());

    loop {
        let group_of: BTreeMap<String, usize> = groups
            .iter()
            .enumerate()
            .flat_map(|(index, group)| {
                group
                    .iter()
                    .map(move |state| (state.clone(), index))
                    .collect::<Vec<_>>()
            })
            .collect();

        let mut refined = Vec::new();

        for group in &groups {
            let mut buckets: BTreeMap<Vec<usize>, Vec<String>> = BTreeMap::new();

            for state in group {
                let signature: Vec<usize> = alphabet
                    .iter()
                    .map(|symbol| {
                        let next = target(state, symbol);
                        *group_of.get(&next).unwrap_or(&usize::MAX)
                    })
                    .collect();
                buckets.entry(signature).or_default().push(state.clone());
            }

            refined.extend(buckets.into_values());
        }

        if refined.len() == groups.len() {
            groups = refined;
            break;
        }

        groups = refined;
    }

    let kept_groups: Vec<&Vec<String>> = groups
        .iter()
        .filter(|group| group.iter().any(|state| state != VIRTUAL_DEAD))
        .collect();

    let group_to_new: BTreeMap<usize, usize> = groups
        .iter()
        .enumerate()
        .filter(|(_, group)| group.iter().any(|state| state != VIRTUAL_DEAD))
        .enumerate()
        .map(|(new_index, (old_index, _))| (old_index, new_index))
        .collect();

    let group_index_of: BTreeMap<String, usize> = groups
        .iter()
        .enumerate()
        .flat_map(|(index, group)| {
            group
                .iter()
                .map(move |state| (state.clone(), index))
                .collect::<Vec<_>>()
        })
        .collect();

    let mut states = Vec::with_capacity(kept_groups.len());
    let mut equivalence_classes = Vec::with_capacity(kept_groups.len());

    for (new_index, group) in kept_groups.iter().enumerate() {
        let real_states: Vec<&String> = group
            .iter()
            .filter(|state| state.as_str() != VIRTUAL_DEAD)
            .collect();

        let Some(first) = real_states.first() else {
            continue;
        };
        let Some(first_state) = project.state(first) else {
            continue;
        };

        let (x, y) = average_position(project, &real_states);
        let is_initial = real_states.iter().any(|state| state.as_str() == initial.id);
        let is_accepting = real_states
            .iter()
            .any(|state| project.state(state).is_some_and(|state| state.is_accepting));

        let comment = if real_states.len() > 1 {
            let labels: Vec<String> = real_states
                .iter()
                .filter_map(|id| project.state(id))
                .map(|state| state.label.clone())
                .collect();
            Some(format!("Fusión de {{{}}}", labels.join(", ")))
        } else {
            first_state.comment.clone()
        };

        states.push(State {
            id: format!("m{new_index}"),
            label: first_state.label.clone(),
            x,
            y,
            is_initial,
            is_accepting,
            comment,
        });

        equivalence_classes.push(real_states.into_iter().cloned().collect());
    }

    let mut minimized_transitions = Vec::new();
    let mut transition_counter = 0usize;

    for (new_index, group) in kept_groups.iter().enumerate() {
        let Some(representative) = group.iter().find(|state| state.as_str() != VIRTUAL_DEAD) else {
            continue;
        };

        for symbol in &alphabet {
            let next = target(representative, symbol);
            let Some(old_target_group) = group_index_of.get(&next).copied() else {
                continue;
            };
            let Some(new_target_group) = group_to_new.get(&old_target_group).copied() else {
                continue;
            };

            minimized_transitions.push(Transition {
                id: format!("mt{transition_counter}"),
                from: format!("m{new_index}"),
                to: format!("m{new_target_group}"),
                curve_offset: 0.0,
                rule: TransitionRule::Fa {
                    symbol: Some(symbol.clone()),
                },
            });
            transition_counter += 1;
        }
    }

    let mut config = project.config.clone();
    config.alphabet = alphabet;

    let minimized = LexoProject {
        schema_version: SCHEMA_VERSION.to_owned(),
        id: format!("{}-min", project.id),
        name: format!("{} — mínimo", project.name),
        description: project.description.clone(),
        machine_type: MachineType::Dfa,
        created_at: project.created_at.clone(),
        updated_at: project.updated_at.clone(),
        config,
        states,
        transitions: minimized_transitions,
        test_cases: project.test_cases.clone(),
        viewport: Viewport::default(),
    };

    Ok(MinimizeResult {
        minimized,
        equivalence_classes,
        removed_unreachable,
    })
}

fn average_position(project: &LexoProject, state_ids: &[&String]) -> (f64, f64) {
    let mut count = 0.0;
    let mut x = 0.0;
    let mut y = 0.0;

    for state_id in state_ids {
        if let Some(state) = project.state(state_id) {
            x += state.x;
            y += state.y;
            count += 1.0;
        }
    }

    if count == 0.0 {
        grid_position(0)
    } else {
        (x / count, y / count)
    }
}

/// Estados que participan en alguna clase de equivalencia (para diagnósticos).
pub fn merged_states(result: &MinimizeResult) -> BTreeSet<String> {
    result
        .equivalence_classes
        .iter()
        .filter(|class| class.len() > 1)
        .flat_map(|class| class.iter().cloned())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::automata::simulate_fa;
    use crate::examples;
    use crate::validation::validate_machine;

    fn all_binary_strings(max_len: usize) -> Vec<String> {
        fn extend(prefix: &mut String, remaining: usize, output: &mut Vec<String>) {
            output.push(prefix.clone());
            if remaining == 0 {
                return;
            }
            for symbol in ["0", "1"] {
                prefix.push_str(symbol);
                extend(prefix, remaining - 1, output);
                prefix.pop();
            }
        }

        let mut output = Vec::new();
        extend(&mut String::new(), max_len, &mut output);
        output
    }

    #[test]
    fn redundant_dfa_is_reduced_to_two_states() {
        let source = examples::redundant_dfa();
        let result = minimize_dfa(&source).expect("minimizar");

        assert_eq!(result.minimized.states.len(), 2);
        assert_eq!(result.removed_unreachable, vec!["s2".to_owned()]);
        assert!(validate_machine(&result.minimized).valid);
        assert_eq!(result.equivalence_classes.len(), 2);

        let classes: Vec<Vec<String>> = result
            .equivalence_classes
            .iter()
            .map(|class| {
                let mut class = class.clone();
                class.sort();
                class
            })
            .collect();
        assert!(classes.contains(&vec!["s0".to_owned(), "s4".to_owned()]));
        assert!(classes.contains(&vec!["s1".to_owned(), "s3".to_owned()]));
    }

    #[test]
    fn minimized_dfa_is_equivalent_to_source() {
        let source = examples::redundant_dfa();
        let result = minimize_dfa(&source).expect("minimizar");

        for input in all_binary_strings(5) {
            let left = simulate_fa(&source, &input, 0).expect("simular origen");
            let right = simulate_fa(&result.minimized, &input, 0).expect("simular mínimo");
            assert_eq!(left.verdict, right.verdict, "cadena '{input}'");
        }
    }

    #[test]
    fn already_minimal_dfa_keeps_its_states() {
        let source = examples::binary_ending_in_01();
        let result = minimize_dfa(&source).expect("minimizar");

        assert_eq!(result.minimized.states.len(), 3);
        assert!(result.removed_unreachable.is_empty());
    }

    #[test]
    fn incomplete_dfa_is_completed_only_for_partitioning() {
        let mut source = examples::binary_ending_in_01();
        source
            .transitions
            .retain(|transition| transition.id != "t2");

        let result = minimize_dfa(&source).expect("minimizar");

        assert!(!result
            .minimized
            .states
            .iter()
            .any(|state| state.id.contains("dead")));
        assert!(validate_machine(&result.minimized).valid);

        for input in all_binary_strings(4) {
            let left = simulate_fa(&source, &input, 0).expect("simular origen");
            let right = simulate_fa(&result.minimized, &input, 0).expect("simular mínimo");
            assert_eq!(left.verdict, right.verdict, "cadena '{input}'");
        }
    }

    #[test]
    fn minimization_is_deterministic() {
        let source = examples::redundant_dfa();

        let first = minimize_dfa(&source).expect("minimizar");
        let second = minimize_dfa(&source).expect("minimizar");

        assert_eq!(first, second);
    }

    #[test]
    fn nfa_input_is_rejected() {
        let source = examples::branching_nfa();

        let error = minimize_dfa(&source).expect_err("no debe minimizar un AFN");

        assert_eq!(error.code, EngineErrorCode::UnsupportedOperation);
    }

    #[test]
    fn merged_states_reports_only_merged_ones() {
        let source = examples::redundant_dfa();
        let result = minimize_dfa(&source).expect("minimizar");
        let merged = merged_states(&result);

        assert!(merged.contains("s0"));
        assert!(merged.contains("s4"));
        assert!(!merged.contains("s2"));
    }
}
