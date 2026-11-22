//! Compatibilidad con archivos JFLAP `.jff` (FA y MT de una cinta).

use crate::automata::grid_position;
use crate::error::{EngineError, EngineErrorCode};
use crate::model::{
    LexoProject, MachineConfig, MachineType, State, TapeMove, TmOperation, Transition,
    TransitionRule, Viewport, SCHEMA_VERSION,
};
use crate::validation::validate_machine;
use roxmltree::{Document, Node};
use std::collections::{BTreeMap, BTreeSet};

const JFLAP_TIMESTAMP: &str = "2026-11-21T00:00:00Z";

/// Importa un `.jff` de JFLAP a un proyecto `.lexo`.
pub fn import_jflap_xml(xml: &str) -> Result<LexoProject, EngineError> {
    let document =
        Document::parse(xml).map_err(|error| parse_error(format!("XML inválido: {error}")))?;

    let root = document.root_element();

    if root.tag_name().name() != "structure" {
        return Err(parse_error(
            "El documento no es un archivo JFLAP: falta <structure>.",
        ));
    }

    let structure_type = child_text(root, "type")
        .ok_or_else(|| parse_error("El archivo JFLAP no declara <type>."))?
        .trim()
        .to_owned();

    let automaton = root
        .children()
        .find(|node| node.is_element() && node.tag_name().name() == "automaton")
        .ok_or_else(|| parse_error("El archivo JFLAP no contiene <automaton>."))?;

    match structure_type.as_str() {
        "fa" => import_fa(automaton),
        "turing" => import_turing(automaton),
        other => Err(parse_error(format!(
            "Tipo JFLAP no soportado: '{other}'. Solo se aceptan 'fa' y 'turing'."
        ))),
    }
}

/// Exporta un proyecto a XML `.jff` compatible con JFLAP 7.1+.
pub fn export_jflap_xml(project: &LexoProject) -> Result<String, EngineError> {
    if project.machine_type == MachineType::TmMulti {
        return Err(EngineError::new(
            EngineErrorCode::UnsupportedOperation,
            "La exportación JFLAP multicinta todavía no está soportada.",
        ));
    }

    if !project.machine_type.is_finite_automaton() && project.machine_type != MachineType::TmSingle
    {
        return Err(EngineError::new(
            EngineErrorCode::UnsupportedOperation,
            "Tipo de máquina no exportable a JFLAP.",
        ));
    }

    let report = validate_machine(project);
    if let Some(error) = report.errors.first() {
        return Err(error.clone());
    }

    let id_map: BTreeMap<&str, usize> = project
        .states
        .iter()
        .enumerate()
        .map(|(index, state)| (state.id.as_str(), index))
        .collect();

    let mut xml = String::new();
    xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n");
    xml.push_str("<!--Created with Lexomata RUST-->\n");
    xml.push_str("<structure>\n");
    xml.push_str(if project.machine_type.is_finite_automaton() {
        "  <type>fa</type>\n"
    } else {
        "  <type>turing</type>\n"
    });
    xml.push_str("  <automaton>\n");

    for (index, state) in project.states.iter().enumerate() {
        xml.push_str(&format!(
            "    <state id=\"{index}\" name=\"{}\">\n",
            escape_xml_attribute(&state.label)
        ));
        xml.push_str(&format!("      <x>{}</x>\n", format_number(state.x)));
        xml.push_str(&format!("      <y>{}</y>\n", format_number(state.y)));
        if state.is_initial {
            xml.push_str("      <initial/>\n");
        }
        if state.is_accepting {
            xml.push_str("      <final/>\n");
        }
        xml.push_str("    </state>\n");
    }

    for transition in &project.transitions {
        let (Some(from), Some(to)) = (
            id_map.get(transition.from.as_str()),
            id_map.get(transition.to.as_str()),
        ) else {
            return Err(EngineError::with_related_ids(
                EngineErrorCode::InvalidTransitionRule,
                format!(
                    "La transición '{}' apunta a un estado inexistente.",
                    transition.id
                ),
                vec![transition.id.clone()],
            ));
        };

        xml.push_str("    <transition>\n");
        xml.push_str(&format!("      <from>{from}</from>\n"));
        xml.push_str(&format!("      <to>{to}</to>\n"));

        match &transition.rule {
            TransitionRule::Fa { .. } => {
                if let Some(symbol) = transition.rule.fa_symbol() {
                    xml.push_str(&format!("      <read>{}</read>\n", escape_xml(symbol)));
                } else {
                    xml.push_str("      <read/>\n");
                }
            }
            TransitionRule::Tm { operations } => {
                let Some(operation) = operations.first() else {
                    return Err(EngineError::with_related_ids(
                        EngineErrorCode::InvalidTransitionRule,
                        format!("La transición '{}' no tiene operaciones.", transition.id),
                        vec![transition.id.clone()],
                    ));
                };

                let read = symbol_or_blank(&operation.read, &project.config.blank_symbol);
                let write = symbol_or_blank(&operation.write, &project.config.blank_symbol);

                xml.push_str(&format!("      <read>{}</read>\n", escape_xml(&read)));
                xml.push_str(&format!("      <write>{}</write>\n", escape_xml(&write)));
                xml.push_str(&format!("      <move>{}</move>\n", operation.r#move));
            }
        }

        xml.push_str("    </transition>\n");
    }

    xml.push_str("  </automaton>\n");
    xml.push_str("</structure>\n");

    Ok(xml)
}

fn import_fa(automaton: Node<'_, '_>) -> Result<LexoProject, EngineError> {
    let states = parse_states(automaton)?;
    let mut transitions = Vec::new();
    let mut symbols = BTreeSet::new();
    let mut has_epsilon = false;
    let mut deterministic = true;
    let mut seen = BTreeSet::new();

    for (index, transition_node) in element_children(automaton, "transition").enumerate() {
        let from = required_child_text(transition_node, "from")?;
        let to = required_child_text(transition_node, "to")?;
        let read = child_text(transition_node, "read").unwrap_or_default();
        let symbol = if read.is_empty() {
            has_epsilon = true;
            None
        } else {
            symbols.insert(read.clone());
            Some(read)
        };

        if !seen.insert((from.clone(), symbol.clone())) {
            deterministic = false;
        }

        transitions.push(Transition {
            id: format!("jt{index}"),
            from,
            to,
            curve_offset: 0.0,
            rule: TransitionRule::Fa { symbol },
        });
    }

    let machine_type = if has_epsilon {
        MachineType::NfaEpsilon
    } else if deterministic {
        MachineType::Dfa
    } else {
        MachineType::Nfa
    };

    Ok(build_project(
        if machine_type == MachineType::Dfa {
            "Autómata finito importado"
        } else {
            "Autómata importado"
        },
        machine_type,
        states,
        transitions,
        symbols.into_iter().collect(),
        Vec::new(),
    ))
}

fn import_turing(automaton: Node<'_, '_>) -> Result<LexoProject, EngineError> {
    let states = parse_states(automaton)?;
    let blank = "□".to_owned();
    let mut transitions = Vec::new();
    let mut symbols = BTreeSet::new();

    for (index, transition_node) in element_children(automaton, "transition").enumerate() {
        let from = required_child_text(transition_node, "from")?;
        let to = required_child_text(transition_node, "to")?;

        let read = child_text(transition_node, "read").unwrap_or_default();
        let write = child_text(transition_node, "write").unwrap_or_default();
        let movement = child_text(transition_node, "move").unwrap_or_else(|| "S".to_owned());

        let read = if read.is_empty() { blank.clone() } else { read };
        let write = if write.is_empty() {
            blank.clone()
        } else {
            write
        };

        if read != blank {
            symbols.insert(read.clone());
        }
        if write != blank {
            symbols.insert(write.clone());
        }

        let movement = match movement.trim() {
            "L" => TapeMove::L,
            "R" => TapeMove::R,
            "S" | "" => TapeMove::S,
            other => {
                return Err(parse_error(format!(
                    "Movimiento de cinta inválido en JFLAP: '{other}'."
                )));
            }
        };

        transitions.push(Transition {
            id: format!("jt{index}"),
            from,
            to,
            curve_offset: 0.0,
            rule: TransitionRule::Tm {
                operations: vec![TmOperation {
                    read,
                    write,
                    r#move: movement,
                }],
            },
        });
    }

    let mut tape_alphabet: Vec<String> = symbols.iter().cloned().collect();
    tape_alphabet.push(blank.clone());

    Ok(build_project(
        "Máquina de Turing importada",
        MachineType::TmSingle,
        states,
        transitions,
        symbols.into_iter().collect(),
        tape_alphabet,
    ))
}

fn parse_states(automaton: Node<'_, '_>) -> Result<Vec<State>, EngineError> {
    let mut states = Vec::new();
    let mut seen = BTreeSet::new();

    for (index, state_node) in element_children(automaton, "state").enumerate() {
        let id = state_node
            .attribute("id")
            .ok_or_else(|| parse_error("Un estado JFLAP no tiene atributo id."))?
            .to_owned();

        if !seen.insert(id.clone()) {
            return Err(parse_error(format!(
                "Identificador de estado JFLAP duplicado: '{id}'."
            )));
        }

        let label = state_node.attribute("name").unwrap_or(&id).to_owned();
        let (default_x, default_y) = grid_position(index);
        let x = child_text(state_node, "x")
            .and_then(|value| value.trim().parse::<f64>().ok())
            .unwrap_or(default_x);
        let y = child_text(state_node, "y")
            .and_then(|value| value.trim().parse::<f64>().ok())
            .unwrap_or(default_y);

        states.push(State {
            id,
            label,
            x,
            y,
            is_initial: has_element_child(state_node, "initial"),
            is_accepting: has_element_child(state_node, "final"),
            comment: None,
        });
    }

    if states.is_empty() {
        return Err(parse_error("El autómata JFLAP no contiene estados."));
    }

    Ok(states)
}

fn build_project(
    name: &str,
    machine_type: MachineType,
    states: Vec<State>,
    transitions: Vec<Transition>,
    alphabet: Vec<String>,
    tape_alphabet: Vec<String>,
) -> LexoProject {
    LexoProject {
        schema_version: SCHEMA_VERSION.to_owned(),
        id: "jflap-import".to_owned(),
        name: name.to_owned(),
        description: Some("Importado desde un archivo JFLAP.".to_owned()),
        machine_type,
        created_at: JFLAP_TIMESTAMP.to_owned(),
        updated_at: JFLAP_TIMESTAMP.to_owned(),
        config: MachineConfig {
            alphabet,
            tape_alphabet,
            ..MachineConfig::default()
        },
        states,
        transitions,
        test_cases: Vec::new(),
        viewport: Viewport::default(),
    }
}

fn element_children<'a, 'input>(
    node: Node<'a, 'input>,
    name: &'a str,
) -> impl Iterator<Item = Node<'a, 'input>> {
    node.children()
        .filter(move |child| child.is_element() && child.tag_name().name() == name)
}

fn child_text(node: Node<'_, '_>, name: &str) -> Option<String> {
    element_children(node, name)
        .next()
        .map(|child| child.text().unwrap_or("").to_owned())
}

fn required_child_text(node: Node<'_, '_>, name: &str) -> Result<String, EngineError> {
    child_text(node, name)
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| parse_error(format!("Falta <{name}> en una transición JFLAP.")))
}

fn has_element_child(node: Node<'_, '_>, name: &str) -> bool {
    node.children()
        .any(|child| child.is_element() && child.tag_name().name() == name)
}

fn symbol_or_blank(symbol: &str, blank: &str) -> String {
    if symbol == blank {
        String::new()
    } else {
        symbol.to_owned()
    }
}

fn format_number(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{value:.0}")
    } else {
        value.to_string()
    }
}

fn escape_xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn escape_xml_attribute(value: &str) -> String {
    escape_xml(value)
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn parse_error(message: impl Into<String>) -> EngineError {
    EngineError::new(EngineErrorCode::JflapParseError, message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::automata::simulate_fa;
    use crate::examples;
    use crate::turing::{tm_run_full, TmStatus};

    fn fa_sample() -> &'static str {
        r#"<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<structure>
  <type>fa</type>
  <automaton>
    <state id="0" name="q0">
      <x>100</x><y>200</y><initial/>
    </state>
    <state id="1" name="q1">
      <x>300</x><y>200</y><final/>
    </state>
    <transition><from>0</from><to>1</to><read>a</read></transition>
    <transition><from>1</from><to>1</to><read>a</read></transition>
  </automaton>
</structure>"#
    }

    #[test]
    fn imports_jflap_fa_and_preserves_coordinates() {
        let project = import_jflap_xml(fa_sample()).expect("importar");

        assert_eq!(project.machine_type, MachineType::Dfa);
        assert_eq!(project.states.len(), 2);
        assert_eq!(project.states[0].label, "q0");
        assert_eq!(project.states[0].x, 100.0);
        assert_eq!(project.states[1].y, 200.0);
        assert!(project.states[0].is_initial);
        assert!(project.states[1].is_accepting);
        assert_eq!(project.effective_alphabet(), vec!["a".to_owned()]);
    }

    #[test]
    fn imports_epsilon_and_infers_nfa_epsilon() {
        let xml = fa_sample().replace("<read>a</read>", "<read/>");

        let project = import_jflap_xml(&xml).expect("importar");

        assert_eq!(project.machine_type, MachineType::NfaEpsilon);
        assert!(project.transitions[0].rule.is_epsilon());
    }

    #[test]
    fn imports_nondeterministic_fa_as_nfa() {
        let xml = fa_sample().replace(
            "<transition><from>1</from><to>1</to><read>a</read></transition>",
            "<transition><from>0</from><to>0</to><read>a</read></transition>",
        );

        let project = import_jflap_xml(&xml).expect("importar");

        assert_eq!(project.machine_type, MachineType::Nfa);
    }

    #[test]
    fn imports_jflap_turing_with_blank_symbols() {
        let xml = r#"<structure>
  <type>turing</type>
  <automaton>
    <state id="0" name="q0"><x>0</x><y>0</y><initial/></state>
    <state id="1" name="q1"><x>100</x><y>0</y><final/></state>
    <transition>
      <from>0</from><to>1</to><read>0</read><write>X</write><move>R</move>
    </transition>
    <transition>
      <from>1</from><to>1</to><read/><write/><move>S</move>
    </transition>
  </automaton>
</structure>"#;

        let project = import_jflap_xml(xml).expect("importar MT");

        assert_eq!(project.machine_type, MachineType::TmSingle);
        assert_eq!(project.config.blank_symbol, "□");
        assert_eq!(project.config.tape_alphabet, vec!["0", "X", "□"]);
        assert_eq!(project.transitions.len(), 2);

        if let TransitionRule::Tm { operations } = &project.transitions[1].rule {
            assert_eq!(operations[0].read, "□");
            assert_eq!(operations[0].write, "□");
        } else {
            panic!("se esperaba regla TM");
        }
    }

    #[test]
    fn malformed_xml_returns_jflap_error() {
        let error = import_jflap_xml("<structure>").expect_err("XML inválido");

        assert_eq!(error.code, EngineErrorCode::JflapParseError);
    }

    #[test]
    fn unsupported_type_returns_jflap_error() {
        let xml = "<structure><type>pda</type><automaton/></structure>";

        let error = import_jflap_xml(xml).expect_err("tipo no soportado");

        assert_eq!(error.code, EngineErrorCode::JflapParseError);
    }

    #[test]
    fn export_fa_roundtrips_exactly() {
        let source = examples::binary_ending_in_01();
        let first = export_jflap_xml(&source).expect("exportar");
        let imported = import_jflap_xml(&first).expect("importar");
        let second = export_jflap_xml(&imported).expect("exportar de nuevo");

        assert_eq!(first, second);
        assert_eq!(imported.machine_type, MachineType::Dfa);
        assert_eq!(imported.states.len(), source.states.len());

        for input in ["", "0", "01", "101", "0100"] {
            let original = simulate_fa(&source, input, 0).expect("simular origen");
            let roundtrip = simulate_fa(&imported, input, 0).expect("simular importado");
            assert_eq!(original.verdict, roundtrip.verdict, "cadena '{input}'");
        }
    }

    #[test]
    fn export_epsilon_fa_roundtrips() {
        let source = examples::epsilon_cycle();
        let xml = export_jflap_xml(&source).expect("exportar");
        let imported = import_jflap_xml(&xml).expect("importar");

        assert_eq!(imported.machine_type, MachineType::NfaEpsilon);
        assert!(imported
            .transitions
            .iter()
            .any(|transition| transition.rule.is_epsilon()));

        for input in ["", "a", "aa", "aaa"] {
            let original = simulate_fa(&source, input, 0).expect("simular origen");
            let roundtrip = simulate_fa(&imported, input, 0).expect("simular importado");
            assert_eq!(original.verdict, roundtrip.verdict, "cadena '{input}'");
        }
    }

    #[test]
    fn export_turing_roundtrips_and_preserves_execution() {
        let source = examples::binary_increment_tm();
        let first = export_jflap_xml(&source).expect("exportar");
        let imported = import_jflap_xml(&first).expect("importar");
        let second = export_jflap_xml(&imported).expect("exportar de nuevo");

        assert_eq!(first, second);
        assert_eq!(imported.machine_type, MachineType::TmSingle);

        for input in ["0", "1", "1011", "111"] {
            let original = tm_run_full(&source, &[input.to_owned()], 0).expect("ejecutar origen");
            let roundtrip =
                tm_run_full(&imported, &[input.to_owned()], 0).expect("ejecutar importado");
            assert_eq!(original.verdict, TmStatus::Accepted);
            assert_eq!(original.verdict, roundtrip.verdict);
            assert_eq!(original.tape.cells, roundtrip.tape.cells, "cinta '{input}'");
        }
    }

    #[test]
    fn export_escapes_xml_characters() {
        let mut source = examples::binary_ending_in_01();
        source.states[0].label = "q<&>\"".to_owned();

        let xml = export_jflap_xml(&source).expect("exportar");

        assert!(xml.contains("name=\"q&lt;&amp;&gt;&quot;\""));
    }
}
