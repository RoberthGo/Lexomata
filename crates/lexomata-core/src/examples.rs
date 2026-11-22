//! Ejemplos integrados, construidos de forma determinista.
//!
//! Se usan en pruebas, en la comprobación del motor y, más adelante, en el
//! menú de ejemplos de la interfaz.

use crate::model::{
    ExpectedVerdict, LexoProject, MachineConfig, MachineType, State, TestCase, Transition,
    TransitionRule, Viewport, SCHEMA_VERSION,
};

const CREATED_AT: &str = "2026-11-21T00:00:00Z";

fn state(id: &str, label: &str, x: f64, y: f64, initial: bool, accepting: bool) -> State {
    State {
        id: id.to_owned(),
        label: label.to_owned(),
        x,
        y,
        is_initial: initial,
        is_accepting: accepting,
        comment: None,
    }
}

fn fa_transition(id: &str, from: &str, to: &str, symbol: Option<&str>) -> Transition {
    Transition {
        id: id.to_owned(),
        from: from.to_owned(),
        to: to.to_owned(),
        curve_offset: 0.0,
        rule: TransitionRule::Fa {
            symbol: symbol.map(str::to_owned),
        },
    }
}

fn fa_project(
    id: &str,
    name: &str,
    machine_type: MachineType,
    states: Vec<State>,
    transitions: Vec<Transition>,
    test_cases: Vec<TestCase>,
) -> LexoProject {
    LexoProject {
        schema_version: SCHEMA_VERSION.to_owned(),
        id: id.to_owned(),
        name: name.to_owned(),
        description: None,
        machine_type,
        created_at: CREATED_AT.to_owned(),
        updated_at: CREATED_AT.to_owned(),
        config: MachineConfig {
            alphabet: vec!["0".to_owned(), "1".to_owned()],
            ..MachineConfig::default()
        },
        states,
        transitions,
        test_cases,
        viewport: Viewport::default(),
    }
}

/// AFD que acepta cadenas binarias terminadas en `01`.
pub fn binary_ending_in_01() -> LexoProject {
    fa_project(
        "example-dfa-ending-01",
        "Binarias terminadas en 01",
        MachineType::Dfa,
        vec![
            state("s0", "q0", 160.0, 240.0, true, false),
            state("s1", "q1", 420.0, 240.0, false, false),
            state("s2", "q2", 680.0, 240.0, false, true),
        ],
        vec![
            fa_transition("t0", "s0", "s1", Some("0")),
            fa_transition("t1", "s0", "s0", Some("1")),
            fa_transition("t2", "s1", "s1", Some("0")),
            fa_transition("t3", "s1", "s2", Some("1")),
            fa_transition("t4", "s2", "s1", Some("0")),
            fa_transition("t5", "s2", "s0", Some("1")),
        ],
        vec![
            TestCase {
                id: "tc0".to_owned(),
                input: "01".to_owned(),
                expected: ExpectedVerdict::Accept,
            },
            TestCase {
                id: "tc1".to_owned(),
                input: "101".to_owned(),
                expected: ExpectedVerdict::Accept,
            },
            TestCase {
                id: "tc2".to_owned(),
                input: "10".to_owned(),
                expected: ExpectedVerdict::Reject,
            },
            TestCase {
                id: "tc3".to_owned(),
                input: String::new(),
                expected: ExpectedVerdict::Reject,
            },
        ],
    )
}

/// AFN-ε con un ciclo de transiciones vacías entre `q0` y `q1`.
pub fn epsilon_cycle() -> LexoProject {
    let mut project = fa_project(
        "example-nfa-epsilon-cycle",
        "Ciclo épsilon",
        MachineType::NfaEpsilon,
        vec![
            state("s0", "q0", 220.0, 240.0, true, false),
            state("s1", "q1", 520.0, 240.0, false, true),
        ],
        vec![
            fa_transition("t0", "s0", "s1", None),
            fa_transition("t1", "s1", "s0", None),
            fa_transition("t2", "s0", "s1", Some("a")),
            fa_transition("t3", "s1", "s1", Some("a")),
        ],
        vec![
            TestCase {
                id: "tc0".to_owned(),
                input: String::new(),
                expected: ExpectedVerdict::Accept,
            },
            TestCase {
                id: "tc1".to_owned(),
                input: "aaaa".to_owned(),
                expected: ExpectedVerdict::Accept,
            },
        ],
    );
    project.config.alphabet = vec!["a".to_owned()];
    project
}

/// AFN con dos ramas para la misma entrada: una muere y otra acepta.
pub fn branching_nfa() -> LexoProject {
    let mut project = fa_project(
        "example-nfa-branching",
        "Ramas simultáneas",
        MachineType::Nfa,
        vec![
            state("s0", "q0", 160.0, 240.0, true, false),
            state("s1", "q1", 420.0, 140.0, false, false),
            state("s2", "q2", 420.0, 340.0, false, false),
            state("s3", "q3", 680.0, 140.0, false, true),
        ],
        vec![
            fa_transition("t0", "s0", "s1", Some("a")),
            fa_transition("t1", "s0", "s2", Some("a")),
            fa_transition("t2", "s1", "s3", Some("b")),
        ],
        vec![
            TestCase {
                id: "tc0".to_owned(),
                input: "ab".to_owned(),
                expected: ExpectedVerdict::Accept,
            },
            TestCase {
                id: "tc1".to_owned(),
                input: "a".to_owned(),
                expected: ExpectedVerdict::Reject,
            },
        ],
    );
    project.config.alphabet = vec!["a".to_owned(), "b".to_owned()];
    project
}

/// AFD con estados equivalentes y un estado inalcanzable.
///
/// Lenguaje: cadenas binarias terminadas en `1`. `q4` es equivalente a `q0`,
/// `q3` es equivalente a `q1` y `q2` es inalcanzable.
pub fn redundant_dfa() -> LexoProject {
    fa_project(
        "example-dfa-redundant",
        "AFD redundante",
        MachineType::Dfa,
        vec![
            state("s0", "q0", 120.0, 240.0, true, false),
            state("s1", "q1", 360.0, 240.0, false, true),
            state("s2", "q2", 600.0, 80.0, false, true),
            state("s3", "q3", 600.0, 240.0, false, true),
            state("s4", "q4", 120.0, 420.0, false, false),
        ],
        vec![
            fa_transition("t0", "s0", "s0", Some("0")),
            fa_transition("t1", "s0", "s1", Some("1")),
            fa_transition("t2", "s1", "s0", Some("0")),
            fa_transition("t3", "s1", "s1", Some("1")),
            fa_transition("t4", "s2", "s2", Some("0")),
            fa_transition("t5", "s2", "s2", Some("1")),
            fa_transition("t6", "s3", "s0", Some("0")),
            fa_transition("t7", "s3", "s1", Some("1")),
            fa_transition("t8", "s4", "s4", Some("0")),
            fa_transition("t9", "s4", "s1", Some("1")),
        ],
        vec![
            TestCase {
                id: "tc0".to_owned(),
                input: "1".to_owned(),
                expected: ExpectedVerdict::Accept,
            },
            TestCase {
                id: "tc1".to_owned(),
                input: "0".to_owned(),
                expected: ExpectedVerdict::Reject,
            },
        ],
    )
}
