//! Algoritmos de autómatas finitos: clausura ε, simulación y transformaciones.

pub mod conversion;
pub mod epsilon;
pub mod simulation;

pub use conversion::{nfa_to_dfa, nfa_to_dfa_with_dead_state, NfaToDfaResult};
pub use epsilon::{epsilon_closure, EpsilonClosure};
pub use simulation::{
    batch_run, simulate_fa, FaBatchResult, FaBranchTrace, FaSimulationTrace, FaStepSnapshot,
    FaVerdict, MAX_TRACE_BRANCHES,
};

/// Posición de cuadrícula determinista para estados generados.
pub(crate) fn grid_position(index: usize) -> (f64, f64) {
    const COLUMNS: usize = 4;
    const X_START: f64 = 160.0;
    const Y_START: f64 = 160.0;
    const X_STEP: f64 = 220.0;
    const Y_STEP: f64 = 180.0;

    let column = index % COLUMNS;
    let row = index / COLUMNS;

    (
        X_START + column as f64 * X_STEP,
        Y_START + row as f64 * Y_STEP,
    )
}
