//! Pruebas de contrato del esquema `.lexo`.
//!
//! Serializa y deserializa ejemplos de AFD, AFN-ε y MT de una cinta para
//! congelar los nombres de campo del contrato JSON.

use lexomata_core::examples;
use lexomata_core::model::{
    LexoProject, MachineConfig, MachineType, State, Transition, TransitionRule, SCHEMA_VERSION,
};

#[test]
fn dfa_roundtrips_without_losing_fields() {
    let project = examples::binary_ending_in_01();
    let json = serde_json::to_string_pretty(&project).expect("serializar AFD");
    let parsed: LexoProject = serde_json::from_str(&json).expect("deserializar AFD");

    assert_eq!(parsed, project);
    assert_eq!(parsed.schema_version, SCHEMA_VERSION);
    assert_eq!(parsed.machine_type, MachineType::Dfa);
    assert!(json.contains("\"machineType\": \"DFA\""));
    assert!(json.contains("\"isInitial\": true"));
    assert!(json.contains("\"curveOffset\": 0.0"));
}

#[test]
fn nfa_epsilon_roundtrips_with_null_symbol() {
    let project = examples::epsilon_cycle();
    let json = serde_json::to_string(&project).expect("serializar AFN-ε");
    let parsed: LexoProject = serde_json::from_str(&json).expect("deserializar AFN-ε");

    assert_eq!(parsed, project);
    assert!(json.contains("\"machineType\":\"NFA_EPSILON\""));
    assert!(json.contains("\"symbol\":null"));
}

#[test]
fn tm_single_roundtrips_with_operations() {
    let project = LexoProject {
        schema_version: SCHEMA_VERSION.to_owned(),
        id: "tm-example".to_owned(),
        name: "MT de ejemplo".to_owned(),
        description: Some("Copia un 0 a la derecha".to_owned()),
        machine_type: MachineType::TmSingle,
        created_at: "2026-11-21T00:00:00Z".to_owned(),
        updated_at: "2026-11-21T00:00:00Z".to_owned(),
        config: MachineConfig {
            alphabet: vec!["0".to_owned()],
            tape_alphabet: vec!["0".to_owned(), "□".to_owned()],
            ..MachineConfig::default()
        },
        states: vec![
            State {
                id: "s0".to_owned(),
                label: "q0".to_owned(),
                x: 0.0,
                y: 0.0,
                is_initial: true,
                is_accepting: false,
                comment: None,
            },
            State {
                id: "s1".to_owned(),
                label: "q1".to_owned(),
                x: 200.0,
                y: 0.0,
                is_initial: false,
                is_accepting: true,
                comment: None,
            },
        ],
        transitions: vec![Transition {
            id: "t0".to_owned(),
            from: "s0".to_owned(),
            to: "s1".to_owned(),
            curve_offset: 0.0,
            rule: TransitionRule::Tm {
                operations: vec![lexomata_core::model::TmOperation {
                    read: "0".to_owned(),
                    write: "0".to_owned(),
                    r#move: lexomata_core::model::TapeMove::R,
                }],
            },
        }],
        test_cases: Vec::new(),
        viewport: Default::default(),
    };

    let json = serde_json::to_string(&project).expect("serializar MT");
    let parsed: LexoProject = serde_json::from_str(&json).expect("deserializar MT");

    assert_eq!(parsed, project);
    assert!(json.contains("\"machineType\":\"TM_SINGLE\""));
    assert!(json.contains("\"operations\":[{"));
    assert!(json.contains("\"move\":\"R\""));
}

#[test]
fn missing_optional_collections_get_defaults() {
    let json = r#"{
        "schemaVersion": "1.0.0",
        "id": "minimal",
        "name": "Mínimo",
        "machineType": "DFA",
        "createdAt": "2026-11-21T00:00:00Z",
        "updatedAt": "2026-11-21T00:00:00Z",
        "config": {},
        "states": [],
        "transitions": []
    }"#;

    let project: LexoProject = serde_json::from_str(json).expect("deserializar mínimo");

    assert!(project.test_cases.is_empty());
    assert_eq!(project.viewport.zoom, 1.0);
    assert_eq!(project.config.blank_symbol, "□");
    assert_eq!(project.config.default_max_steps, 10_000);
}
