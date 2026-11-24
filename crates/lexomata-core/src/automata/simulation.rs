//! Simulación determinista de AFD, AFN y AFN-ε.

use crate::automata::epsilon::epsilon_closure;
use crate::error::EngineError;
use crate::model::LexoProject;
use crate::validation::validate_machine;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

/// Máximo de ramas representativas que se conservan por paso.
pub const MAX_TRACE_BRANCHES: usize = 64;

/// Veredicto de una simulación de autómata finito.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FaVerdict {
    Accepted,
    Rejected,
    StepLimit,
}

impl FaVerdict {
    /// `true` solo para aceptación.
    pub fn is_accepted(self) -> bool {
        self == Self::Accepted
    }
}

/// Rama activa representativa de una traza AFN.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FaBranchTrace {
    pub state_id: String,
    /// Camino de aristas recorridas desde el estado inicial.
    pub transition_ids: Vec<String>,
}

/// Snapshot de la configuración en un paso de simulación.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FaStepSnapshot {
    pub step_index: u32,
    pub input_index: usize,
    pub consumed_symbol: Option<String>,
    pub active_state_ids: Vec<String>,
    pub fired_transition_ids: Vec<String>,
    pub active_branches: Vec<FaBranchTrace>,
    pub branches_truncated: bool,
}

/// Traza completa de una simulación.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FaSimulationTrace {
    pub verdict: FaVerdict,
    pub steps: Vec<FaStepSnapshot>,
    pub total_steps: u32,
    pub input_length: usize,
    pub max_steps: u32,
}

/// Resultado de un caso de ejecución por lotes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FaBatchResult {
    pub input: String,
    pub verdict: FaVerdict,
    pub steps: u32,
    pub elapsed_micros: u64,
}

#[derive(Debug, Clone)]
struct BranchPath {
    state_id: String,
    transition_ids: Vec<String>,
    visited: BTreeSet<String>,
}

impl BranchPath {
    fn new(state_id: &str) -> Self {
        let mut visited = BTreeSet::new();
        visited.insert(state_id.to_owned());
        Self {
            state_id: state_id.to_owned(),
            transition_ids: Vec::new(),
            visited,
        }
    }
}

/// Simula una cadena sobre un autómata finito.
///
/// `max_steps` limita los símbolos consumidos; `0` usa
/// `config.default_max_steps`. Devuelve el primer error de validación si el
/// proyecto no es simulable.
pub fn simulate_fa(
    project: &LexoProject,
    input: &str,
    max_steps: u32,
) -> Result<FaSimulationTrace, EngineError> {
    let report = validate_machine(project);
    if let Some(error) = report.errors.first() {
        return Err(error.clone());
    }

    Ok(simulate_validated(project, input, max_steps))
}

fn simulate_validated(project: &LexoProject, input: &str, max_steps: u32) -> FaSimulationTrace {
    let max_steps = if max_steps == 0 {
        project.config.default_max_steps
    } else {
        max_steps
    };

    let symbols: Vec<char> = input.chars().collect();
    let initial_id = project
        .initial_state()
        .map(|state| state.id.clone())
        .unwrap_or_default();

    let initial_closure = epsilon_closure_of_state(project, &initial_id);
    let mut current = initial_closure.states.clone();

    let (initial_branches, initial_truncated) =
        expand_branch(project, BranchPath::new(&initial_id));

    let mut steps = vec![FaStepSnapshot {
        step_index: 0,
        input_index: 0,
        consumed_symbol: None,
        active_state_ids: current.iter().cloned().collect(),
        fired_transition_ids: initial_closure.transition_ids,
        active_branches: to_trace(&initial_branches),
        branches_truncated: initial_truncated,
    }];

    let mut verdict = None;

    for (index, symbol) in symbols.iter().enumerate() {
        if index as u32 >= max_steps {
            verdict = Some(FaVerdict::StepLimit);
            break;
        }

        let symbol_text = symbol.to_string();
        let mut symbol_transitions = BTreeSet::new();
        let mut next_raw = BTreeSet::new();

        for state_id in &current {
            for transition in project
                .transitions
                .iter()
                .filter(|transition| transition.from == *state_id)
            {
                if transition.rule.fa_symbol() == Some(symbol_text.as_str())
                    && project.state(&transition.to).is_some()
                {
                    symbol_transitions.insert(transition.id.clone());
                    next_raw.insert(transition.to.clone());
                }
            }
        }

        let closure = epsilon_closure(project, &next_raw);
        current = closure.states.clone();

        let mut fired = symbol_transitions;
        fired.extend(closure.transition_ids);

        let (branches, truncated) = step_branches(project, steps.last(), &symbol_text);

        steps.push(FaStepSnapshot {
            step_index: (index + 1) as u32,
            input_index: index + 1,
            consumed_symbol: Some(symbol_text),
            active_state_ids: current.iter().cloned().collect(),
            fired_transition_ids: fired.into_iter().collect(),
            active_branches: to_trace(&branches),
            branches_truncated: truncated,
        });

        if current.is_empty() {
            verdict = Some(FaVerdict::Rejected);
            break;
        }
    }

    let verdict = verdict.unwrap_or_else(|| {
        if current.iter().any(|state_id| {
            project
                .state(state_id)
                .is_some_and(|state| state.is_accepting)
        }) {
            FaVerdict::Accepted
        } else {
            FaVerdict::Rejected
        }
    });

    let total_steps = steps.len().saturating_sub(1) as u32;

    FaSimulationTrace {
        verdict,
        steps,
        total_steps,
        input_length: symbols.len(),
        max_steps,
    }
}

fn epsilon_closure_of_state(
    project: &LexoProject,
    state_id: &str,
) -> crate::automata::EpsilonClosure {
    let mut seeds = BTreeSet::new();
    if !state_id.is_empty() {
        seeds.insert(state_id.to_owned());
    }
    epsilon_closure(project, &seeds)
}

fn step_branches(
    project: &LexoProject,
    previous: Option<&FaStepSnapshot>,
    symbol: &str,
) -> (Vec<BranchPath>, bool) {
    let Some(previous) = previous else {
        return (Vec::new(), false);
    };

    let mut results = Vec::new();
    let mut truncated = false;

    // Reconstruye el camino de cada rama representativa a partir de la traza.
    // La traza solo guarda IDs de transición; para expandir ε necesitamos los
    // estados visitados, que se recalculan siguiendo el camino desde q0.
    for branch in &previous.active_branches {
        let Some(path) = rebuild_branch(project, branch) else {
            continue;
        };

        for transition in project
            .transitions
            .iter()
            .filter(|transition| transition.from == path.state_id)
        {
            if transition.rule.fa_symbol() != Some(symbol)
                || project.state(&transition.to).is_none()
            {
                continue;
            }

            let mut next = path.clone();
            next.state_id = transition.to.clone();
            next.transition_ids.push(transition.id.clone());
            next.visited.insert(transition.to.clone());

            let remaining = MAX_TRACE_BRANCHES.saturating_sub(results.len());
            if remaining == 0 {
                return (results, true);
            }

            let (mut expanded, was_truncated) = expand_branch_limited(project, next, remaining);
            results.append(&mut expanded);
            truncated |= was_truncated;

            if results.len() >= MAX_TRACE_BRANCHES {
                return (results, true);
            }
        }
    }

    (results, truncated)
}

fn rebuild_branch(project: &LexoProject, branch: &FaBranchTrace) -> Option<BranchPath> {
    let mut path = BranchPath::new(&project.initial_state()?.id);

    for transition_id in &branch.transition_ids {
        let transition = project
            .transitions
            .iter()
            .find(|transition| transition.id == *transition_id)?;

        if transition.from != path.state_id {
            return None;
        }

        path.state_id = transition.to.clone();
        path.transition_ids.push(transition.id.clone());
        path.visited.insert(transition.to.clone());
    }

    if path.state_id == branch.state_id {
        Some(path)
    } else {
        None
    }
}

fn expand_branch(project: &LexoProject, branch: BranchPath) -> (Vec<BranchPath>, bool) {
    expand_branch_limited(project, branch, MAX_TRACE_BRANCHES)
}

fn expand_branch_limited(
    project: &LexoProject,
    branch: BranchPath,
    limit: usize,
) -> (Vec<BranchPath>, bool) {
    if limit == 0 {
        return (Vec::new(), true);
    }

    let mut result = vec![branch.clone()];
    let mut stack = vec![branch];

    while let Some(current) = stack.pop() {
        for transition in project.transitions.iter().filter(|transition| {
            transition.from == current.state_id && transition.rule.is_epsilon()
        }) {
            if project.state(&transition.to).is_none() || current.visited.contains(&transition.to) {
                continue;
            }

            if result.len() >= limit {
                return (result, true);
            }

            let mut next = current.clone();
            next.state_id = transition.to.clone();
            next.transition_ids.push(transition.id.clone());
            next.visited.insert(transition.to.clone());

            result.push(next.clone());
            stack.push(next);
        }
    }

    (result, false)
}

fn to_trace(branches: &[BranchPath]) -> Vec<FaBranchTrace> {
    branches
        .iter()
        .map(|branch| FaBranchTrace {
            state_id: branch.state_id.clone(),
            transition_ids: branch.transition_ids.clone(),
        })
        .collect()
}

/// Ejecuta varias cadenas sobre el mismo autómata.
pub fn batch_run(
    project: &LexoProject,
    inputs: &[String],
    max_steps: u32,
) -> Result<Vec<FaBatchResult>, EngineError> {
    let report = validate_machine(project);
    if let Some(error) = report.errors.first() {
        return Err(error.clone());
    }

    let mut results = Vec::with_capacity(inputs.len());

    for input in inputs {
        #[cfg(not(target_arch = "wasm32"))]
        let started = std::time::Instant::now();

        let trace = simulate_validated(project, input, max_steps);

        #[cfg(not(target_arch = "wasm32"))]
        let elapsed_micros = started.elapsed().as_micros().min(u128::from(u64::MAX)) as u64;
        #[cfg(target_arch = "wasm32")]
        let elapsed_micros = 0;

        results.push(FaBatchResult {
            input: input.clone(),
            verdict: trace.verdict,
            steps: trace.total_steps,
            elapsed_micros,
        });
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::examples;
    use crate::model::TransitionRule;

    fn accepted(trace: &FaSimulationTrace) -> bool {
        trace.verdict == FaVerdict::Accepted
    }

    #[test]
    fn dfa_accepts_strings_ending_in_01() {
        let project = examples::binary_ending_in_01();

        for input in ["01", "101", "001", "1101"] {
            let trace = simulate_fa(&project, input, 0).expect("simular");
            assert!(accepted(&trace), "{input} debería aceptarse");
        }

        for input in ["", "0", "10", "110", "0100"] {
            let trace = simulate_fa(&project, input, 0).expect("simular");
            assert!(!accepted(&trace), "{input} debería rechazarse");
        }
    }

    #[test]
    fn empty_string_checks_initial_acceptance() {
        let mut project = examples::binary_ending_in_01();
        project.states[0].is_accepting = true;

        let trace = simulate_fa(&project, "", 0).expect("simular");

        assert!(accepted(&trace));
        assert_eq!(trace.steps.len(), 1);
        assert_eq!(trace.total_steps, 0);
    }

    #[test]
    fn epsilon_cycle_terminates_and_accepts_empty() {
        let project = examples::epsilon_cycle();

        let trace = simulate_fa(&project, "", 0).expect("simular");
        assert!(accepted(&trace));
        assert_eq!(trace.steps[0].active_state_ids, vec!["s0", "s1"]);

        let trace = simulate_fa(&project, "aaa", 0).expect("simular");
        assert!(accepted(&trace));
        assert_eq!(trace.total_steps, 3);
    }

    #[test]
    fn nfa_keeps_multiple_branches_and_one_can_accept() {
        let project = examples::branching_nfa();

        let trace = simulate_fa(&project, "ab", 0).expect("simular");
        assert!(accepted(&trace));
        assert_eq!(trace.steps[1].active_state_ids, vec!["s1", "s2"]);
        assert_eq!(trace.steps[2].active_state_ids, vec!["s3"]);

        let branch = trace.steps[2]
            .active_branches
            .iter()
            .find(|branch| branch.state_id == "s3")
            .expect("rama aceptadora");
        assert_eq!(branch.transition_ids, vec!["t0", "t2"]);
    }

    #[test]
    fn nfa_rejects_when_all_branches_die() {
        let project = examples::branching_nfa();

        let trace = simulate_fa(&project, "a", 0).expect("simular");

        assert_eq!(trace.verdict, FaVerdict::Rejected);
    }

    #[test]
    fn dead_end_rejects_before_consuming_everything() {
        let mut project = examples::binary_ending_in_01();
        project
            .transitions
            .retain(|transition| transition.id != "t2");

        let trace = simulate_fa(&project, "00", 0).expect("simular");

        assert_eq!(trace.verdict, FaVerdict::Rejected);
        assert_eq!(trace.total_steps, 2);
        assert!(trace.steps[2].active_state_ids.is_empty());
        assert_eq!(trace.steps[2].input_index, 2);
    }

    #[test]
    fn step_limit_is_reported_with_partial_trace() {
        let project = examples::binary_ending_in_01();
        let input = "0".repeat(20);

        let trace = simulate_fa(&project, &input, 5).expect("simular");

        assert_eq!(trace.verdict, FaVerdict::StepLimit);
        assert_eq!(trace.total_steps, 5);
        assert_eq!(trace.steps.len(), 6);
        assert_eq!(trace.max_steps, 5);
    }

    #[test]
    fn simulation_is_deterministic() {
        let project = examples::branching_nfa();

        let first = simulate_fa(&project, "ab", 0).expect("simular");
        let second = simulate_fa(&project, "ab", 0).expect("simular");

        assert_eq!(first, second);
    }

    #[test]
    fn invalid_project_is_not_simulated() {
        let mut project = examples::binary_ending_in_01();
        project.states[0].is_initial = false;

        let error = simulate_fa(&project, "01", 0).expect_err("debe fallar");

        assert_eq!(error.code, crate::EngineErrorCode::NoInitialState);
    }

    #[test]
    fn batch_returns_one_result_per_input() {
        let project = examples::binary_ending_in_01();
        let inputs = vec!["01".to_owned(), "10".to_owned(), String::new()];

        let results = batch_run(&project, &inputs, 0).expect("lote");

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].verdict, FaVerdict::Accepted);
        assert_eq!(results[1].verdict, FaVerdict::Rejected);
        assert_eq!(results[2].verdict, FaVerdict::Rejected);
        assert_eq!(results[0].steps, 2);
    }

    #[test]
    fn unicode_input_is_tokenized_by_character() {
        let mut project = examples::binary_ending_in_01();
        project.config.alphabet = vec!["á".to_owned()];
        project.transitions = vec![
            crate::model::Transition {
                id: "t0".to_owned(),
                from: "s0".to_owned(),
                to: "s1".to_owned(),
                curve_offset: 0.0,
                rule: TransitionRule::Fa {
                    symbol: Some("á".to_owned()),
                },
                comment: None,
            },
            crate::model::Transition {
                id: "t1".to_owned(),
                from: "s1".to_owned(),
                to: "s2".to_owned(),
                curve_offset: 0.0,
                rule: TransitionRule::Fa {
                    symbol: Some("é".to_owned()),
                },
                comment: None,
            },
        ];

        let trace = simulate_fa(&project, "áé", 0).expect("simular unicode");

        assert!(accepted(&trace));
        assert_eq!(trace.input_length, 2);
    }
}
