function changeTool(clickedButton, tool) {
    const toolButtons = document.querySelectorAll('.tool-button');

    toolButtons.forEach(button => {
        button.classList.remove('active');
    });

    clickedButton.classList.add('active');

    currentTool = tool;
}