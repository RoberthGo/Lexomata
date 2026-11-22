//! Ejecución de máquinas de Turing de una cinta, con deltas reversibles.

use crate::error::{EngineError, EngineErrorCode};
use crate::model::{LexoProject, MachineType, TransitionRule};
use crate::turing::tape::{Tape, TapeSnapshot};
use crate::validation::validate_machine;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Límite absoluto de pasos para una ejecución rápida.
pub const MAX_RUN_STEPS: u32 = 200_000;

/// Estado de ejecución de una máquina de Turing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TmStatus {
    Running,
    Accepted,
    Rejected,
    StepLimit,
}

/// Cambio de una celda durante un paso, suficiente para deshacerlo.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmTapeChange {
    pub tape_index: usize,
    pub cell_index: i64,
    pub prev_symbol: String,
    pub next_symbol: String,
    pub prev_head: i64,
    pub next_head: i64,
}

/// Delta reversible de un paso.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmStepDelta {
    pub step_index: u32,
    pub prev_state_id: String,
    pub next_state_id: String,
    pub fired_transition_id: String,
    pub tape_changes: Vec<TmTapeChange>,
}

/// Estado completo de ejecución, serializable para el puente WASM.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmRuntimeState {
    pub current_state_id: String,
    pub tape: BTreeMap<i64, String>,
    pub head_index: i64,
    pub step_count: u32,
    pub status: TmStatus,
}

impl TmRuntimeState {
    /// Reconstruye el runtime desde un snapshot de la interfaz.
    pub fn from_snapshot(snapshot: &TmStepSnapshot) -> Self {
        Self {
            current_state_id: snapshot.current_state_id.clone(),
            tape: snapshot.tape.cells.clone(),
            head_index: snapshot.tape.head_index,
            step_count: snapshot.step_index,
            status: snapshot.status,
        }
    }
}

/// Snapshot visible en la interfaz.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmStepSnapshot {
    pub step_index: u32,
    pub current_state_id: String,
    pub tape: TapeSnapshot,
    pub status: TmStatus,
}

/// Resultado de un paso individual.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmStepResult {
    pub snapshot: TmStepSnapshot,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fired_transition_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta: Option<TmStepDelta>,
    pub verdict: TmStatus,
}

/// Resultado de una ejecución completa.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmFullRunResult {
    pub verdict: TmStatus,
    pub final_state_id: String,
    pub tape: TapeSnapshot,
    pub total_steps: u32,
    pub deltas: Vec<TmStepDelta>,
}

/// Resultado de un caso por lotes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmBatchResult {
    pub input: Vec<String>,
    pub verdict: TmStatus,
    pub steps: u32,
    pub tape: BTreeMap<i64, String>,
}

struct AdvanceOutcome {
    runtime: TmRuntimeState,
    fired_transition_id: Option<String>,
    delta: Option<TmStepDelta>,
}

/// Inicializa una MT de una cinta con la entrada en `0..n`.
pub fn tm_init(
    project: &LexoProject,
    tape_inputs: &[String],
) -> Result<TmStepSnapshot, EngineError> {
    validate_tm_project(project)?;

    let initial = project.initial_state().ok_or_else(|| {
        EngineError::new(
            EngineErrorCode::NoInitialState,
            "La máquina no tiene estado inicial.",
        )
    })?;

    let input = tape_inputs.first().map(String::as_str).unwrap_or("");
    let tape = Tape::from_input(input, project.config.blank_symbol.clone());

    Ok(TmStepSnapshot {
        step_index: 0,
        current_state_id: initial.id.clone(),
        tape: tape.snapshot(),
        status: TmStatus::Running,
    })
}

/// Ejecuta un paso interactivo.
pub fn tm_step(
    project: &LexoProject,
    runtime: &TmRuntimeState,
) -> Result<TmStepResult, EngineError> {
    validate_tm_project(project)?;

    let outcome = advance(project, runtime.clone());
    let snapshot = snapshot_from_runtime(project, &outcome.runtime);

    Ok(TmStepResult {
        snapshot,
        fired_transition_id: outcome.fired_transition_id,
        delta: outcome.delta,
        verdict: outcome.runtime.status,
    })
}

/// Ejecuta hasta aceptar, rechazar o alcanzar `max_steps`.
pub fn tm_run_full(
    project: &LexoProject,
    tape_inputs: &[String],
    max_steps: u32,
) -> Result<TmFullRunResult, EngineError> {
    validate_tm_project(project)?;
    Ok(run_full_validated(project, tape_inputs, max_steps))
}

/// Ejecuta varios casos por lotes.
pub fn tm_batch_run(
    project: &LexoProject,
    cases: &[Vec<String>],
    max_steps: u32,
) -> Result<Vec<TmBatchResult>, EngineError> {
    validate_tm_project(project)?;

    let mut results = Vec::with_capacity(cases.len());

    for case in cases {
        let run = run_full_validated(project, case, max_steps);
        results.push(TmBatchResult {
            input: case.clone(),
            verdict: run.verdict,
            steps: run.total_steps,
            tape: run.tape.cells,
        });
    }

    Ok(results)
}

/// Deshace un paso aplicando su delta.
pub fn rewind_one(
    project: &LexoProject,
    runtime: &TmRuntimeState,
    delta: &TmStepDelta,
) -> TmRuntimeState {
    let mut restored = runtime.clone();
    restored.current_state_id = delta.prev_state_id.clone();
    restored.step_count = delta.step_index.saturating_sub(1);
    restored.status = TmStatus::Running;

    for change in delta.tape_changes.iter().rev() {
        if change.prev_symbol == project.config.blank_symbol {
            restored.tape.remove(&change.cell_index);
        } else {
            restored
                .tape
                .insert(change.cell_index, change.prev_symbol.clone());
        }

        if change.tape_index == 0 {
            restored.head_index = change.prev_head;
        }
    }

    restored
}

/// Deshace una secuencia de deltas en orden inverso.
pub fn rewind(
    project: &LexoProject,
    runtime: &TmRuntimeState,
    deltas: &[TmStepDelta],
) -> TmRuntimeState {
    let mut restored = runtime.clone();

    for delta in deltas.iter().rev() {
        restored = rewind_one(project, &restored, delta);
    }

    restored
}

fn validate_tm_project(project: &LexoProject) -> Result<(), EngineError> {
    if project.machine_type != MachineType::TmSingle {
        return Err(EngineError::new(
            EngineErrorCode::UnsupportedOperation,
            "Esta versión del motor solo simula máquinas de Turing de una cinta (TM_SINGLE).",
        ));
    }

    let report = validate_machine(project);
    if let Some(error) = report.errors.first() {
        return Err(error.clone());
    }

    Ok(())
}

fn effective_max_steps(project: &LexoProject, max_steps: u32) -> u32 {
    let requested = if max_steps == 0 {
        project.config.default_max_steps
    } else {
        max_steps
    };

    requested.min(MAX_RUN_STEPS)
}

fn run_full_validated(
    project: &LexoProject,
    tape_inputs: &[String],
    max_steps: u32,
) -> TmFullRunResult {
    let initial = project
        .initial_state()
        .map(|state| state.id.clone())
        .unwrap_or_default();

    let input = tape_inputs.first().map(String::as_str).unwrap_or("");
    let tape = Tape::from_input(input, project.config.blank_symbol.clone());
    let mut runtime = TmRuntimeState {
        current_state_id: initial,
        tape: tape.cells().clone(),
        head_index: 0,
        step_count: 0,
        status: TmStatus::Running,
    };

    let max_steps = effective_max_steps(project, max_steps);
    let mut deltas = Vec::new();

    loop {
        if runtime.status != TmStatus::Running {
            break;
        }

        let accepting = project
            .state(&runtime.current_state_id)
            .is_some_and(|state| state.is_accepting);

        if accepting {
            runtime.status = TmStatus::Accepted;
            break;
        }

        if runtime.step_count >= max_steps {
            runtime.status = TmStatus::StepLimit;
            break;
        }

        let outcome = advance(project, runtime);
        if let Some(delta) = outcome.delta {
            deltas.push(delta);
        }
        runtime = outcome.runtime;
    }

    let snapshot = snapshot_from_runtime(project, &runtime);

    TmFullRunResult {
        verdict: runtime.status,
        final_state_id: runtime.current_state_id,
        tape: snapshot.tape,
        total_steps: runtime.step_count,
        deltas,
    }
}

fn advance(project: &LexoProject, runtime: TmRuntimeState) -> AdvanceOutcome {
    if runtime.status != TmStatus::Running {
        return AdvanceOutcome {
            runtime,
            fired_transition_id: None,
            delta: None,
        };
    }

    let Some(current_state) = project.state(&runtime.current_state_id) else {
        return AdvanceOutcome {
            runtime: TmRuntimeState {
                status: TmStatus::Rejected,
                ..runtime
            },
            fired_transition_id: None,
            delta: None,
        };
    };

    if current_state.is_accepting {
        return AdvanceOutcome {
            runtime: TmRuntimeState {
                status: TmStatus::Accepted,
                ..runtime
            },
            fired_transition_id: None,
            delta: None,
        };
    }

    let mut tape = Tape::from_cells(
        runtime.tape.clone(),
        project.config.blank_symbol.clone(),
        runtime.head_index,
    );
    let read_symbol = tape.read().to_owned();
    let prev_head = tape.head();

    let transition = project.transitions.iter().find(|transition| {
        if transition.from != runtime.current_state_id {
            return false;
        }

        match &transition.rule {
            TransitionRule::Tm { operations } => operations
                .first()
                .is_some_and(|operation| operation.read == read_symbol),
            TransitionRule::Fa { .. } => false,
        }
    });

    let Some(transition) = transition else {
        return AdvanceOutcome {
            runtime: TmRuntimeState {
                status: TmStatus::Rejected,
                ..runtime
            },
            fired_transition_id: None,
            delta: None,
        };
    };

    let TransitionRule::Tm { operations } = &transition.rule else {
        return AdvanceOutcome {
            runtime: TmRuntimeState {
                status: TmStatus::Rejected,
                ..runtime
            },
            fired_transition_id: None,
            delta: None,
        };
    };

    let Some(operation) = operations.first() else {
        return AdvanceOutcome {
            runtime: TmRuntimeState {
                status: TmStatus::Rejected,
                ..runtime
            },
            fired_transition_id: None,
            delta: None,
        };
    };

    tape.write(&operation.write);
    tape.move_head(operation.r#move);
    let next_head = tape.head();
    let next_state_id = transition.to.clone();
    let step_index = runtime.step_count + 1;

    let delta = TmStepDelta {
        step_index,
        prev_state_id: runtime.current_state_id.clone(),
        next_state_id: next_state_id.clone(),
        fired_transition_id: transition.id.clone(),
        tape_changes: vec![TmTapeChange {
            tape_index: 0,
            cell_index: prev_head,
            prev_symbol: read_symbol,
            next_symbol: operation.write.clone(),
            prev_head,
            next_head,
        }],
    };

    let status = if project
        .state(&next_state_id)
        .is_some_and(|state| state.is_accepting)
    {
        TmStatus::Accepted
    } else {
        TmStatus::Running
    };

    AdvanceOutcome {
        runtime: TmRuntimeState {
            current_state_id: next_state_id,
            tape: tape.cells().clone(),
            head_index: next_head,
            step_count: step_index,
            status,
        },
        fired_transition_id: Some(transition.id.clone()),
        delta: Some(delta),
    }
}

fn snapshot_from_runtime(project: &LexoProject, runtime: &TmRuntimeState) -> TmStepSnapshot {
    let tape = Tape::from_cells(
        runtime.tape.clone(),
        project.config.blank_symbol.clone(),
        runtime.head_index,
    );

    TmStepSnapshot {
        step_index: runtime.step_count,
        current_state_id: runtime.current_state_id.clone(),
        tape: tape.snapshot(),
        status: runtime.status,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::examples;

    fn run(project: &LexoProject, input: &str, max_steps: u32) -> TmFullRunResult {
        tm_run_full(project, &[input.to_owned()], max_steps).expect("ejecutar MT")
    }

    fn cells_as_string(project: &LexoProject, tape: &BTreeMap<i64, String>) -> String {
        if tape.is_empty() {
            return String::new();
        }

        let min = *tape.keys().next().expect("mínimo");
        let max = *tape.keys().next_back().expect("máximo");
        let mut output = String::new();

        for index in min..=max {
            output.push_str(
                tape.get(&index)
                    .map(String::as_str)
                    .unwrap_or(&project.config.blank_symbol),
            );
        }

        output
    }

    #[test]
    fn binary_increment_produces_exact_tape() {
        let project = examples::binary_increment_tm();

        let result = run(&project, "1011", 0);
        assert_eq!(result.verdict, TmStatus::Accepted);
        assert_eq!(cells_as_string(&project, &result.tape.cells), "1100");

        let result = run(&project, "0", 0);
        assert_eq!(result.verdict, TmStatus::Accepted);
        assert_eq!(cells_as_string(&project, &result.tape.cells), "1");

        let result = run(&project, "111", 0);
        assert_eq!(result.verdict, TmStatus::Accepted);
        assert_eq!(cells_as_string(&project, &result.tape.cells), "1000");
        assert_eq!(result.tape.min_index, -1);
    }

    #[test]
    fn equal_zeros_and_ones_recognizer() {
        let project = examples::equal_zeros_ones_tm();

        for input in ["01", "0011", "000111"] {
            let result = run(&project, input, 0);
            assert_eq!(result.verdict, TmStatus::Accepted, "{input}");
        }

        for input in ["", "001", "10", "0101"] {
            let result = run(&project, input, 0);
            assert_eq!(result.verdict, TmStatus::Rejected, "{input}");
        }
    }

    #[test]
    fn tape_can_cross_negative_indices_and_return() {
        let project = examples::negative_tape_tm();

        let result = run(&project, "", 0);

        assert_eq!(result.verdict, TmStatus::Accepted);
        assert_eq!(result.tape.cells.get(&-2), Some(&"C".to_owned()));
        assert_eq!(result.tape.cells.get(&-1), Some(&"B".to_owned()));
        assert_eq!(result.tape.cells.get(&0), Some(&"A".to_owned()));
        assert_eq!(result.tape.head_index, 1);
    }

    #[test]
    fn infinite_loop_stops_at_step_limit() {
        let project = examples::infinite_loop_tm();

        let result = run(&project, "", 100);

        assert_eq!(result.verdict, TmStatus::StepLimit);
        assert_eq!(result.total_steps, 100);
        assert_eq!(result.deltas.len(), 100);
        assert_eq!(result.tape.head_index, 100);
    }

    #[test]
    fn rewind_restores_the_initial_configuration() {
        let project = examples::infinite_loop_tm();
        let result = run(&project, "", 50);

        let final_runtime = TmRuntimeState {
            current_state_id: result.final_state_id.clone(),
            tape: result.tape.cells.clone(),
            head_index: result.tape.head_index,
            step_count: result.total_steps,
            status: result.verdict,
        };

        let restored = rewind(&project, &final_runtime, &result.deltas);

        assert_eq!(restored.current_state_id, "s0");
        assert_eq!(restored.head_index, 0);
        assert_eq!(restored.step_count, 0);
        assert_eq!(restored.status, TmStatus::Running);
        assert!(restored.tape.is_empty());
    }

    #[test]
    fn step_back_restores_one_step() {
        let project = examples::binary_increment_tm();
        let init = tm_init(&project, &["1".to_owned()]).expect("init");

        let first = tm_step(&project, &TmRuntimeState::from_snapshot(&init)).expect("paso 1");
        assert_eq!(first.verdict, TmStatus::Running);
        assert_eq!(first.fired_transition_id.as_deref(), Some("t1"));
        assert_eq!(first.snapshot.tape.head_index, 1);

        let runtime = TmRuntimeState::from_snapshot(&first.snapshot);
        let restored = rewind_one(&project, &runtime, first.delta.as_ref().expect("delta"));

        assert_eq!(restored.current_state_id, "s0");
        assert_eq!(restored.head_index, 0);
        assert_eq!(restored.step_count, 0);
    }

    #[test]
    fn accepting_initial_state_halts_immediately() {
        let mut project = examples::binary_increment_tm();
        project.states[0].is_accepting = true;

        let result = run(&project, "101", 100);

        assert_eq!(result.verdict, TmStatus::Accepted);
        assert_eq!(result.total_steps, 0);
        assert!(result.deltas.is_empty());
    }

    #[test]
    fn no_transition_rejects_without_delta() {
        let project = examples::binary_increment_tm();

        let result = run(&project, "abc", 100);

        assert_eq!(result.verdict, TmStatus::Rejected);
        assert_eq!(result.total_steps, 0);
        assert!(result.deltas.is_empty());
    }

    #[test]
    fn batch_reports_each_case() {
        let project = examples::equal_zeros_ones_tm();
        let cases = vec![
            vec!["01".to_owned()],
            vec!["001".to_owned()],
            vec!["0011".to_owned()],
        ];

        let results = tm_batch_run(&project, &cases, 0).expect("lote");

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].verdict, TmStatus::Accepted);
        assert_eq!(results[1].verdict, TmStatus::Rejected);
        assert_eq!(results[2].verdict, TmStatus::Accepted);
    }

    #[test]
    fn multi_tape_is_not_supported_yet() {
        let mut project = examples::binary_increment_tm();
        project.machine_type = MachineType::TmMulti;
        project.config.tape_count = 2;

        let error = tm_init(&project, &[String::new()]).expect_err("no soportado");

        assert_eq!(error.code, EngineErrorCode::UnsupportedOperation);
    }

    #[test]
    fn execution_is_deterministic() {
        let project = examples::equal_zeros_ones_tm();

        let first = run(&project, "0011", 0);
        let second = run(&project, "0011", 0);

        assert_eq!(first, second);
    }
}
