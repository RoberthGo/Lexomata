//! Clausura ε con detección de ciclos.

use crate::model::LexoProject;
use std::collections::{BTreeSet, VecDeque};

/// Resultado de una clausura ε.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EpsilonClosure {
    /// Estados alcanzados, ordenados por ID.
    pub states: BTreeSet<String>,
    /// Aristas ε recorridas, ordenadas por ID y sin duplicados.
    pub transition_ids: Vec<String>,
}

impl EpsilonClosure {
    /// `true` si no se alcanzó ningún estado.
    pub fn is_empty(&self) -> bool {
        self.states.is_empty()
    }
}

/// Calcula la clausura ε de un conjunto de estados.
///
/// Usa BFS con un `BTreeSet` de visitados para terminar incluso ante ciclos
/// ε como `q0 → q1 → q0`.
pub fn epsilon_closure(project: &LexoProject, seeds: &BTreeSet<String>) -> EpsilonClosure {
    let mut states = BTreeSet::new();
    let mut transition_ids = BTreeSet::new();
    let mut queue = VecDeque::new();

    for seed in seeds {
        if project.state(seed).is_some() && states.insert(seed.clone()) {
            queue.push_back(seed.clone());
        }
    }

    while let Some(current) = queue.pop_front() {
        for transition in project
            .transitions
            .iter()
            .filter(|transition| transition.from == current && transition.rule.is_epsilon())
        {
            transition_ids.insert(transition.id.clone());

            if project.state(&transition.to).is_some() && states.insert(transition.to.clone()) {
                queue.push_back(transition.to.clone());
            }
        }
    }

    EpsilonClosure {
        states,
        transition_ids: transition_ids.into_iter().collect(),
    }
}

/// Clausura ε de un único estado.
pub fn epsilon_closure_of(project: &LexoProject, state_id: &str) -> EpsilonClosure {
    let mut seeds = BTreeSet::new();
    seeds.insert(state_id.to_owned());
    epsilon_closure(project, &seeds)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::examples;

    #[test]
    fn closure_terminates_on_epsilon_cycle() {
        let project = examples::epsilon_cycle();
        let closure = epsilon_closure_of(&project, "s0");

        assert_eq!(
            closure.states,
            BTreeSet::from(["s0".to_owned(), "s1".to_owned()])
        );
        assert_eq!(closure.transition_ids, vec!["t0", "t1"]);
    }

    #[test]
    fn closure_of_missing_state_is_empty() {
        let project = examples::binary_ending_in_01();
        let closure = epsilon_closure_of(&project, "fantasma");

        assert!(closure.is_empty());
        assert!(closure.transition_ids.is_empty());
    }
}
