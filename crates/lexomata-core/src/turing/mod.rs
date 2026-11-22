//! Motor de máquinas de Turing deterministas de una cinta.

pub mod simulation;
pub mod tape;

pub use simulation::{
    rewind, rewind_one, tm_batch_run, tm_init, tm_run_full, tm_step, TmBatchResult,
    TmFullRunResult, TmRuntimeState, TmStatus, TmStepDelta, TmStepResult, TmStepSnapshot,
    TmTapeChange, MAX_RUN_STEPS,
};
pub use tape::{Tape, TapeSnapshot};
