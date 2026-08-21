use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;

const MAX_HISTORY: usize = 20;

pub struct HistoryState {
    pub undo_stacks: HashMap<String, Vec<Vec<u8>>>,
    pub redo_stacks: HashMap<String, Vec<Vec<u8>>>,
}

impl Default for HistoryState {
    fn default() -> Self {
        Self {
            undo_stacks: HashMap::new(),
            redo_stacks: HashMap::new(),
        }
    }
}

#[tauri::command]
pub fn history_before_edit(
    file_path: String,
    state: tauri::State<'_, Mutex<HistoryState>>,
) -> Result<(), String> {
    let data = fs::read(&file_path).map_err(|e| e.to_string())?;
    let key = file_path.to_lowercase();
    let mut state = state.lock().map_err(|e| e.to_string())?;

    let stack = state.undo_stacks.entry(key.clone()).or_default();
    stack.push(data);
    if stack.len() > MAX_HISTORY {
        stack.remove(0);
    }

    state.redo_stacks.insert(key, Vec::new());
    Ok(())
}

#[tauri::command]
pub fn history_undo(
    file_path: String,
    state: tauri::State<'_, Mutex<HistoryState>>,
) -> Result<bool, String> {
    let key = file_path.to_lowercase();
    let mut state = state.lock().map_err(|e| e.to_string())?;

    // Pop from undo stack
    let prev = match state.undo_stacks.get_mut(&key) {
        Some(s) if !s.is_empty() => s.pop().unwrap(),
        _ => return Ok(false),
    };

    // Save current to redo
    let current = fs::read(&file_path).map_err(|e| e.to_string())?;
    state.redo_stacks.entry(key).or_default().push(current);

    // Restore
    fs::write(&file_path, prev).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn history_redo(
    file_path: String,
    state: tauri::State<'_, Mutex<HistoryState>>,
) -> Result<bool, String> {
    let key = file_path.to_lowercase();
    let mut state = state.lock().map_err(|e| e.to_string())?;

    // Pop from redo stack
    let next = match state.redo_stacks.get_mut(&key) {
        Some(s) if !s.is_empty() => s.pop().unwrap(),
        _ => return Ok(false),
    };

    // Save current to undo
    let current = fs::read(&file_path).map_err(|e| e.to_string())?;
    state.undo_stacks.entry(key).or_default().push(current);

    // Restore
    fs::write(&file_path, next).map_err(|e| e.to_string())?;
    Ok(true)
}
