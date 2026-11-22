//! Cinta infinita en ambas direcciones con almacenamiento disperso.

use crate::model::TapeMove;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Vista serializable de una cinta para la interfaz.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TapeSnapshot {
    /// Solo celdas distintas del blanco.
    pub cells: BTreeMap<i64, String>,
    pub min_index: i64,
    pub max_index: i64,
    pub head_index: i64,
}

/// Cinta infinita dispersa.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Tape {
    blank: String,
    cells: BTreeMap<i64, String>,
    head: i64,
}

impl Tape {
    /// Crea una cinta en blanco con el cabezal en `0`.
    pub fn new(blank: impl Into<String>) -> Self {
        Self {
            blank: blank.into(),
            cells: BTreeMap::new(),
            head: 0,
        }
    }

    /// Crea una cinta colocando la entrada en `0..n` y el cabezal en `0`.
    pub fn from_input(input: &str, blank: impl Into<String>) -> Self {
        let blank = blank.into();
        let mut tape = Self::new(blank.clone());

        for (index, character) in input.chars().enumerate() {
            let symbol = character.to_string();
            if symbol != blank {
                tape.cells.insert(index as i64, symbol);
            }
        }

        tape
    }

    /// Reconstruye una cinta desde un mapa de celdas no blancas.
    pub fn from_cells(cells: BTreeMap<i64, String>, blank: impl Into<String>, head: i64) -> Self {
        let blank = blank.into();
        let mut tape = Self::new(blank);

        for (index, symbol) in cells {
            if !symbol.is_empty() && symbol != tape.blank {
                tape.cells.insert(index, symbol);
            }
        }

        tape.head = head;
        tape
    }

    /// Símbolo bajo el cabezal.
    pub fn read(&self) -> &str {
        self.cells
            .get(&self.head)
            .map(String::as_str)
            .unwrap_or(&self.blank)
    }

    /// Escribe bajo el cabezal; el blanco elimina la celda del mapa.
    pub fn write(&mut self, symbol: &str) {
        if symbol == self.blank || symbol.is_empty() {
            self.cells.remove(&self.head);
        } else {
            self.cells.insert(self.head, symbol.to_owned());
        }
    }

    /// Mueve el cabezal según `L`, `R` o `S`.
    pub fn move_head(&mut self, movement: TapeMove) {
        match movement {
            TapeMove::L => self.head -= 1,
            TapeMove::R => self.head += 1,
            TapeMove::S => {}
        }
    }

    /// Posición actual del cabezal.
    pub fn head(&self) -> i64 {
        self.head
    }

    /// Celdas no blancas.
    pub fn cells(&self) -> &BTreeMap<i64, String> {
        &self.cells
    }

    /// Símbolo blanco.
    pub fn blank(&self) -> &str {
        &self.blank
    }

    /// Vista compacta para la interfaz.
    pub fn snapshot(&self) -> TapeSnapshot {
        let min_index = self.cells.keys().next().copied().unwrap_or(self.head);
        let max_index = self.cells.keys().next_back().copied().unwrap_or(self.head);

        TapeSnapshot {
            cells: self.cells.clone(),
            min_index,
            max_index,
            head_index: self.head,
        }
    }

    /// Contenido entre `from` y `to`, rellenando huecos con blanco.
    pub fn range_to_string(&self, from: i64, to: i64) -> String {
        if from > to {
            return String::new();
        }

        let mut output = String::new();
        for index in from..=to {
            output.push_str(
                self.cells
                    .get(&index)
                    .map(String::as_str)
                    .unwrap_or(&self.blank),
            );
        }
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_cells_read_as_blank() {
        let tape = Tape::from_input("", "□");

        assert_eq!(tape.read(), "□");
        assert_eq!(tape.head(), 0);
    }

    #[test]
    fn input_is_placed_from_zero() {
        let tape = Tape::from_input("011", "□");

        assert_eq!(tape.read(), "0");
        assert_eq!(tape.range_to_string(0, 2), "011");
    }

    #[test]
    fn writing_blank_removes_the_cell() {
        let mut tape = Tape::from_input("0", "□");
        tape.write("□");

        assert!(tape.cells().is_empty());
        assert_eq!(tape.read(), "□");
    }

    #[test]
    fn head_can_cross_negative_indices() {
        let mut tape = Tape::new("□");
        tape.move_head(TapeMove::L);
        tape.write("A");
        tape.move_head(TapeMove::L);
        tape.write("B");

        assert_eq!(tape.cells().get(&-1), Some(&"A".to_owned()));
        assert_eq!(tape.cells().get(&-2), Some(&"B".to_owned()));
        assert_eq!(tape.head(), -2);
    }

    #[test]
    fn snapshot_reports_bounds_and_head() {
        let tape = Tape::from_input("01", "□");
        let snapshot = tape.snapshot();

        assert_eq!(snapshot.min_index, 0);
        assert_eq!(snapshot.max_index, 1);
        assert_eq!(snapshot.head_index, 0);
    }
}
