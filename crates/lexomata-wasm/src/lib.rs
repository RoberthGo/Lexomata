//! Puente delgado entre el motor Rust y la interfaz Web/Nativa.
//!
//! Regla: ninguna función de este crate debe usar `unwrap`, `expect` ni `panic!`
//! en código de producción. Los errores se devuelven como `Result` serializable.
//!
//! Todas las funciones reciben y devuelven JSON tipado con el sobre:
//! `{ "ok": true, "data": ... }` o `{ "ok": false, "error": ... }`.

use lexomata_core::automata::{
    minimize_dfa, nfa_to_dfa_with_dead_state, simulate_fa, FaBatchResult, FaSimulationTrace,
    MinimizeResult, NfaToDfaResult,
};
use lexomata_core::error::{EngineError, EngineErrorCode};
use lexomata_core::formal::get_formal_definition as core_formal_definition;
use lexomata_core::formats::{
    export_jflap_xml as core_export_jflap, import_jflap_xml as core_import_jflap,
};
use lexomata_core::model::LexoProject;
use lexomata_core::turing::{
    rewind as core_rewind, tm_batch_run as core_tm_batch_run, tm_init as core_tm_init,
    tm_run_full as core_tm_run_full, tm_step as core_tm_step, TmBatchResult, TmFullRunResult,
    TmRuntimeState, TmStepDelta, TmStepResult, TmStepSnapshot,
};
use lexomata_core::validation::{validate_machine as core_validate_machine, ValidationReport};
use serde::de::DeserializeOwned;
use serde::Serialize;
use wasm_bindgen::prelude::*;

const INTERNAL_ERROR_JSON: &str = concat!(
    r#"{"ok":false,"error":{"code":"INTERNAL_ERROR","#,
    r#""message":"No se pudo serializar la respuesta del motor."}}"#
);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OkEnvelope<T> {
    ok: bool,
    data: T,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorEnvelope {
    ok: bool,
    error: EngineError,
}

fn success<T: Serialize>(data: T) -> String {
    serde_json::to_string(&OkEnvelope { ok: true, data })
        .unwrap_or_else(|_| INTERNAL_ERROR_JSON.to_owned())
}

fn failure(error: EngineError) -> String {
    serde_json::to_string(&ErrorEnvelope { ok: false, error })
        .unwrap_or_else(|_| INTERNAL_ERROR_JSON.to_owned())
}

fn run<T: Serialize>(operation: impl FnOnce() -> Result<T, EngineError>) -> String {
    match operation() {
        Ok(data) => success(data),
        Err(error) => failure(error),
    }
}

fn parse_project(json: &str) -> Result<LexoProject, EngineError> {
    parse_json(json, "proyecto .lexo")
}

fn parse_json<T: DeserializeOwned>(json: &str, label: &str) -> Result<T, EngineError> {
    serde_json::from_str(json).map_err(|error| {
        EngineError::new(
            EngineErrorCode::InvalidSchema,
            format!("JSON inválido para {label}: {error}"),
        )
    })
}

/// Versión del motor, útil para diagnóstico y comprobaciones de humo.
#[wasm_bindgen]
pub fn engine_version() -> String {
    lexomata_core::engine_version().to_owned()
}

/// Valida un proyecto y devuelve errores bloqueantes y advertencias.
#[wasm_bindgen]
pub fn validate_machine(project_json: &str) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        Ok::<ValidationReport, EngineError>(core_validate_machine(&project))
    })
}

/// Devuelve la definición formal y la tabla de transiciones.
#[wasm_bindgen]
pub fn get_formal_definition(project_json: &str) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        core_formal_definition(&project)
    })
}

/// Simula una cadena sobre un AFD, AFN o AFN-ε.
#[wasm_bindgen]
pub fn fa_simulate_full(project_json: &str, input: &str, max_steps: u32) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        simulate_fa(&project, input, max_steps)
    })
}

/// Ejecuta una lista de cadenas sobre un autómata finito.
#[wasm_bindgen]
pub fn fa_batch_run(project_json: &str, inputs_json: &str, max_steps: u32) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        let inputs: Vec<String> = parse_json(inputs_json, "lista de entradas")?;
        let mut results: Vec<FaBatchResult> = Vec::with_capacity(inputs.len());

        for input in inputs {
            let trace: FaSimulationTrace = simulate_fa(&project, &input, max_steps)?;
            results.push(FaBatchResult {
                input,
                verdict: trace.verdict,
                steps: trace.total_steps,
                elapsed_micros: 0,
            });
        }

        Ok::<Vec<FaBatchResult>, EngineError>(results)
    })
}

/// Convierte un AFN o AFN-ε en un AFD por construcción de subconjuntos.
#[wasm_bindgen]
pub fn fa_nfa_to_dfa(project_json: &str, include_dead_state: bool) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        let result: NfaToDfaResult = nfa_to_dfa_with_dead_state(&project, include_dead_state)?;
        Ok::<NfaToDfaResult, EngineError>(result)
    })
}

/// Minimiza un AFD por refinamiento de particiones.
#[wasm_bindgen]
pub fn fa_minimize_dfa(project_json: &str) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        let result: MinimizeResult = minimize_dfa(&project)?;
        Ok::<MinimizeResult, EngineError>(result)
    })
}

/// Inicializa una máquina de Turing de una cinta.
#[wasm_bindgen]
pub fn tm_init(project_json: &str, tape_inputs_json: &str) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        let inputs: Vec<String> = parse_json(tape_inputs_json, "entradas de cinta")?;
        let snapshot: TmStepSnapshot = core_tm_init(&project, &inputs)?;
        Ok::<TmStepSnapshot, EngineError>(snapshot)
    })
}

/// Convierte un snapshot de la interfaz en el estado de ejecución completo.
#[wasm_bindgen]
pub fn tm_runtime_from_snapshot(snapshot_json: &str) -> String {
    run(|| {
        let snapshot: TmStepSnapshot = parse_json(snapshot_json, "snapshot de ejecución")?;
        Ok::<TmRuntimeState, EngineError>(TmRuntimeState::from_snapshot(&snapshot))
    })
}

/// Ejecuta un paso interactivo de una máquina de Turing.
#[wasm_bindgen]
pub fn tm_step(project_json: &str, runtime_json: &str) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        let runtime: TmRuntimeState = parse_json(runtime_json, "estado de ejecución")?;
        let result: TmStepResult = core_tm_step(&project, &runtime)?;
        Ok::<TmStepResult, EngineError>(result)
    })
}

/// Ejecuta una máquina de Turing hasta detenerse o alcanzar el límite.
#[wasm_bindgen]
pub fn tm_run_full(project_json: &str, tape_inputs_json: &str, max_steps: u32) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        let inputs: Vec<String> = parse_json(tape_inputs_json, "entradas de cinta")?;
        let result: TmFullRunResult = core_tm_run_full(&project, &inputs, max_steps)?;
        Ok::<TmFullRunResult, EngineError>(result)
    })
}

/// Ejecuta varios casos de cinta por lotes.
#[wasm_bindgen]
pub fn tm_batch_run(project_json: &str, cases_json: &str, max_steps: u32) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        let cases: Vec<Vec<String>> = parse_json(cases_json, "casos de cinta")?;
        let results: Vec<TmBatchResult> = core_tm_batch_run(&project, &cases, max_steps)?;
        Ok::<Vec<TmBatchResult>, EngineError>(results)
    })
}

/// Deshace pasos aplicando sus deltas en orden inverso.
#[wasm_bindgen]
pub fn tm_rewind(project_json: &str, runtime_json: &str, deltas_json: &str) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        let runtime: TmRuntimeState = parse_json(runtime_json, "estado de ejecución")?;
        let deltas: Vec<TmStepDelta> = parse_json(deltas_json, "deltas de ejecución")?;
        let restored: TmRuntimeState = core_rewind(&project, &runtime, &deltas);
        Ok::<TmRuntimeState, EngineError>(restored)
    })
}

/// Importa un archivo `.jff` de JFLAP.
#[wasm_bindgen]
pub fn import_jflap_xml(xml: &str) -> String {
    run(|| core_import_jflap(xml))
}

/// Exporta un proyecto a XML `.jff` compatible con JFLAP.
#[wasm_bindgen]
pub fn export_jflap_xml(project_json: &str) -> String {
    run(|| {
        let project = parse_project(project_json)?;
        core_export_jflap(&project)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use lexomata_core::examples;

    fn project_json(project: &LexoProject) -> String {
        serde_json::to_string(project).expect("serializar proyecto")
    }

    fn parse_envelope(json: &str) -> serde_json::Value {
        serde_json::from_str(json).expect("JSON del sobre")
    }

    #[test]
    fn wasm_bridge_exposes_engine_version() {
        assert!(!engine_version().is_empty());
    }

    #[test]
    fn validate_returns_ok_envelope() {
        let json = validate_machine(&project_json(&examples::binary_ending_in_01()));
        let value = parse_envelope(&json);

        assert_eq!(value["ok"], true);
        assert_eq!(value["data"]["valid"], true);
    }

    #[test]
    fn invalid_project_returns_error_envelope() {
        let json = validate_machine("{no es json}");
        let value = parse_envelope(&json);

        assert_eq!(value["ok"], false);
        assert_eq!(value["error"]["code"], "INVALID_SCHEMA");
    }

    #[test]
    fn fa_simulation_and_batch_work() {
        let project = project_json(&examples::binary_ending_in_01());

        let single = parse_envelope(&fa_simulate_full(&project, "101", 0));
        assert_eq!(single["data"]["verdict"], "ACCEPTED");

        let batch = parse_envelope(&fa_batch_run(&project, r#"["01","10",""]"#, 0));
        assert_eq!(batch["data"][0]["verdict"], "ACCEPTED");
        assert_eq!(batch["data"][1]["verdict"], "REJECTED");
        assert_eq!(batch["data"][2]["verdict"], "REJECTED");
    }

    #[test]
    fn conversion_and_minimization_are_exposed() {
        let nfa = project_json(&examples::branching_nfa());
        let converted = parse_envelope(&fa_nfa_to_dfa(&nfa, false));
        assert_eq!(converted["ok"], true);
        assert!(converted["data"]["subsetMap"].is_object());

        let dfa = project_json(&examples::redundant_dfa());
        let minimized = parse_envelope(&fa_minimize_dfa(&dfa));
        assert_eq!(
            minimized["data"]["minimized"]["states"]
                .as_array()
                .map(Vec::len),
            Some(2)
        );
    }

    #[test]
    fn turing_functions_work_through_the_bridge() {
        let project = project_json(&examples::binary_increment_tm());

        let init = parse_envelope(&tm_init(&project, r#"["1"]"#));
        assert_eq!(init["data"]["status"], "RUNNING");

        let snapshot = serde_json::to_string(&init["data"]).expect("snapshot");
        let runtime = parse_envelope(&tm_runtime_from_snapshot(&snapshot));
        let runtime_json = serde_json::to_string(&runtime["data"]).expect("runtime");
        let step = parse_envelope(&tm_step(&project, &runtime_json));
        assert_eq!(step["data"]["snapshot"]["tape"]["headIndex"], 1);

        let full = parse_envelope(&tm_run_full(&project, r#"["1011"]"#, 0));
        assert_eq!(full["data"]["verdict"], "ACCEPTED");

        let batch = parse_envelope(&tm_batch_run(&project, r#"[["0"],["111"]]"#, 0));
        assert_eq!(batch["data"][0]["verdict"], "ACCEPTED");
        assert_eq!(batch["data"][1]["verdict"], "ACCEPTED");
    }

    #[test]
    fn jflap_roundtrip_works_through_the_bridge() {
        let project = project_json(&examples::binary_ending_in_01());

        let exported = parse_envelope(&export_jflap_xml(&project));
        let xml = exported["data"].as_str().expect("xml").to_owned();

        let imported = parse_envelope(&import_jflap_xml(&xml));
        assert_eq!(imported["ok"], true);
        assert_eq!(imported["data"]["machineType"], "DFA");
    }

    #[test]
    fn formal_definition_is_exposed() {
        let project = project_json(&examples::binary_ending_in_01());
        let formal = parse_envelope(&get_formal_definition(&project));

        assert_eq!(formal["ok"], true);
        assert!(formal["data"]["text"]
            .as_str()
            .is_some_and(|text| text.contains("q0")));
    }
}
