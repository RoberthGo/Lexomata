export class ThemeController {
  constructor(toggleButton) {
    this.button = toggleButton;
    this.body = document.body;

    if (this.button) {
      this.button.addEventListener('click', () => this.toggleTheme());
    }
  }

  toggleTheme() {
    this.body.classList.toggle('dark');
    this.body.classList.toggle('light');
    // We could emit a theme:changed event here if the CanvasRenderer needs to know immediately
  }
}
