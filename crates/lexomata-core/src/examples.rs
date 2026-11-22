//! Ejemplos integrados, construidos de forma determinista.
//!
//! Se usan en pruebas, en la comprobación del motor y, más adelante, en el
//! menú de ejemplos de la interfaz.

use crate::model::{
    ExpectedVerdict, LexoProject, MachineConfig, MachineType, State, TapeMove, TestCase,
    TmOperation, Transition, TransitionRule, Viewport, SCHEMA_VERSION,
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

fn tm_transition(
    id: &str,
    from: &str,
    to: &str,
    read: &str,
    write: &str,
    movement: TapeMove,
) -> Transition {
    Transition {
        id: id.to_owned(),
        from: from.to_owned(),
        to: to.to_owned(),
        curve_offset: 0.0,
        rule: TransitionRule::Tm {
            operations: vec![TmOperation {
                read: read.to_owned(),
                write: write.to_owned(),
                r#move: movement,
            }],
        },
    }
}

fn tm_project(
    id: &str,
    name: &str,
    states: Vec<State>,
    transitions: Vec<Transition>,
    alphabet: Vec<&str>,
    tape_alphabet: Vec<&str>,
) -> LexoProject {
    LexoProject {
        schema_version: SCHEMA_VERSION.to_owned(),
        id: id.to_owned(),
        name: name.to_owned(),
        description: None,
        machine_type: MachineType::TmSingle,
        created_at: CREATED_AT.to_owned(),
        updated_at: CREATED_AT.to_owned(),
        config: MachineConfig {
            alphabet: alphabet.into_iter().map(str::to_owned).collect(),
            tape_alphabet: tape_alphabet.into_iter().map(str::to_owned).collect(),
            ..MachineConfig::default()
        },
        states,
        transitions,
        test_cases: Vec::new(),
        viewport: Viewport::default(),
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
            fa_transition("t0", "s0", "s4", Some("0")),
            fa_transition("t1", "s0", "s1", Some("1")),
            fa_transition("t2", "s1", "s0", Some("0")),
            fa_transition("t3", "s1", "s3", Some("1")),
            fa_transition("t4", "s2", "s2", Some("0")),
            fa_transition("t5", "s2", "s2", Some("1")),
            fa_transition("t6", "s3", "s0", Some("0")),
            fa_transition("t7", "s3", "s3", Some("1")),
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

/// MT que suma 1 a un número binario.
pub fn binary_increment_tm() -> LexoProject {
    tm_project(
        "example-tm-binary-increment",
        "Incremento binario",
        vec![
            state("s0", "q0", 160.0, 240.0, true, false),
            state("s1", "q1", 420.0, 240.0, false, false),
            state("s2", "q2", 680.0, 240.0, false, true),
        ],
        vec![
            tm_transition("t0", "s0", "s0", "0", "0", TapeMove::R),
            tm_transition("t1", "s0", "s0", "1", "1", TapeMove::R),
            tm_transition("t2", "s0", "s1", "□", "□", TapeMove::L),
            tm_transition("t3", "s1", "s1", "1", "0", TapeMove::L),
            tm_transition("t4", "s1", "s2", "0", "1", TapeMove::S),
            tm_transition("t5", "s1", "s2", "□", "1", TapeMove::S),
        ],
        vec!["0", "1"],
        vec!["0", "1", "□"],
    )
}

/// MT que reconoce `0^n 1^n` para `n >= 1`.
pub fn equal_zeros_ones_tm() -> LexoProject {
    tm_project(
        "example-tm-equal-zeros-ones",
        "0^n 1^n",
        vec![
            state("s0", "q0", 160.0, 240.0, true, false),
            state("s1", "q1", 380.0, 120.0, false, false),
            state("s2", "q2", 380.0, 360.0, false, false),
            state("s3", "q3", 600.0, 240.0, false, false),
            state("s4", "q_accept", 840.0, 120.0, false, true),
            state("s5", "q_reject", 840.0, 360.0, false, false),
        ],
        vec![
            tm_transition("t0", "s0", "s1", "0", "X", TapeMove::R),
            tm_transition("t1", "s0", "s0", "X", "X", TapeMove::R),
            tm_transition("t2", "s0", "s3", "Y", "Y", TapeMove::R),
            tm_transition("t3", "s0", "s5", "□", "□", TapeMove::S),
            tm_transition("t4", "s1", "s1", "0", "0", TapeMove::R),
            tm_transition("t5", "s1", "s1", "Y", "Y", TapeMove::R),
            tm_transition("t6", "s1", "s2", "1", "Y", TapeMove::L),
            tm_transition("t7", "s2", "s2", "0", "0", TapeMove::L),
            tm_transition("t8", "s2", "s2", "Y", "Y", TapeMove::L),
            tm_transition("t9", "s2", "s0", "X", "X", TapeMove::R),
            tm_transition("t10", "s3", "s3", "Y", "Y", TapeMove::R),
            tm_transition("t11", "s3", "s4", "□", "□", TapeMove::S),
        ],
        vec!["0", "1"],
        vec!["0", "1", "X", "Y", "□"],
    )
}

/// MT que escribe en índices negativos y vuelve al origen.
pub fn negative_tape_tm() -> LexoProject {
    tm_project(
        "example-tm-negative-tape",
        "Índices negativos",
        vec![
            state("s0", "q0", 160.0, 240.0, true, false),
            state("s1", "q1", 360.0, 240.0, false, false),
            state("s2", "q2", 560.0, 240.0, false, false),
            state("s3", "q3", 760.0, 240.0, false, false),
            state("s4", "q4", 960.0, 240.0, false, false),
            state("s5", "q_accept", 1160.0, 240.0, false, true),
        ],
        vec![
            tm_transition("t0", "s0", "s1", "□", "A", TapeMove::L),
            tm_transition("t1", "s1", "s2", "□", "B", TapeMove::L),
            tm_transition("t2", "s2", "s3", "□", "C", TapeMove::L),
            tm_transition("t3", "s3", "s4", "□", "□", TapeMove::R),
            tm_transition("t4", "s4", "s4", "C", "C", TapeMove::R),
            tm_transition("t5", "s4", "s4", "B", "B", TapeMove::R),
            tm_transition("t6", "s4", "s4", "A", "A", TapeMove::R),
            tm_transition("t7", "s4", "s5", "□", "□", TapeMove::S),
        ],
        Vec::new(),
        vec!["A", "B", "C", "□"],
    )
}

/// MT que se mueve indefinidamente a la derecha.
pub fn infinite_loop_tm() -> LexoProject {
    tm_project(
        "example-tm-infinite-loop",
        "Bucle infinito",
        vec![state("s0", "q0", 240.0, 240.0, true, false)],
        vec![tm_transition("t0", "s0", "s0", "□", "□", TapeMove::R)],
        Vec::new(),
        vec!["□"],
    )
}
