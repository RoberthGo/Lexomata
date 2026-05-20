export class JsonWorkspaceRepository {
  static export(document) {
    const data = document.getState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `automata_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static import(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        callback(null, data);
      } catch (err) {
        callback(err, null);
      }
    };
    reader.readAsText(file);
  }
}
